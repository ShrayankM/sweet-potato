package com.sweetpotato.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.S3Object;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sweetpotato.config.DynamicConfigurationProperties;
import com.sweetpotato.dto.fuel.ExtractedFuelData;
import com.sweetpotato.dto.fuel.MistralOcrRequest;
import com.sweetpotato.dto.fuel.MistralOcrResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class MistralOcrService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private final AmazonS3 s3Client;
    private final DynamicConfigurationProperties configProperties;

    private static final String FUEL_RECEIPT_PROMPT = """
        Please analyze this fuel receipt image and extract the following information in JSON format:
        {
            "stationName": "Name of gas station",
            "stationBrand": "Brand (Shell, BP, Exxon, etc.)",
            "address": "Complete address if visible",
            "city": "City name",
            "state": "State abbreviation",
            "zipCode": "ZIP code",
            "totalAmount": "Total amount paid (number only, no currency symbol)",
            "liters": "Number of liters purchased (floating point number only)",
            "pricePerLiter": "Price per liter (floating point number only)",
            "fuelType": "Type of fuel (Petrol, Diesel, CNG, LPG, etc.)",
            "fuelGrade": "Grade of fuel (Regular, Premium, etc.)",
            "purchaseDateTime": "Date and time of purchase in ISO format",
            "receiptNumber": "Receipt or transaction number",
            "paymentMethod": "Payment method (Credit, Debit, Cash, etc.)",
            "confidence": "Your confidence level in this extraction (0-1)"
        }
        
        If any field is not clearly visible or readable, set it to null.
        Respond with ONLY the JSON object, no additional text.
        """;

    public Mono<ExtractedFuelData> processReceiptImage(String imageUrl) {
        log.info("Processing fuel receipt image with Mistral AI: {}", imageUrl);

        // First, download the image and convert to base64
        return downloadAndEncodeImage(imageUrl)
                .flatMap(base64Image -> {
                    MistralOcrRequest request = buildMistralRequest(base64Image);
                    
                    // Log the request for debugging
                    try {
                        String requestJson = objectMapper.writeValueAsString(request);
                        log.info("Sending request to Mistral AI: {}", requestJson.substring(0, Math.min(500, requestJson.length())) + "...");
                    } catch (Exception e) {
                        log.warn("Could not log request JSON", e);
                    }
                    
                    return webClientBuilder.build()
                            .post()
                            .uri(configProperties.getMistralApiUrl() + "/chat/completions")
                            .header("Authorization", "Bearer " + configProperties.getMistralApiKey())
                            .header("Content-Type", "application/json")
                            .bodyValue(request)
                            .retrieve()
                            .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                                clientResponse -> {
                                    return clientResponse.bodyToMono(String.class)
                                        .flatMap(errorBody -> {
                                            log.error("Mistral AI API Error ({}): {}", clientResponse.statusCode(), errorBody);
                                            return Mono.error(new RuntimeException("Mistral AI API Error: " + errorBody));
                                        });
                                })
                            .bodyToMono(MistralOcrResponse.class)
                            .doOnNext(response -> log.info("Received Mistral AI response: {}", response))
                            .map(this::parseExtractedData);
                })
                .doOnError(error -> log.error("Error calling Mistral AI API", error));
    }

    private Mono<String> downloadAndEncodeImage(String imageUrl) {
        return Mono.fromCallable(() -> {
            try {
                // Extract S3 key from URL
                String s3Key = extractS3KeyFromUrl(imageUrl);
                log.info("Downloading image from S3 with key: {}", s3Key);
                
                // Download image from S3
                S3Object s3Object = s3Client.getObject(configProperties.getAwsBucketName(), s3Key);
                byte[] imageBytes = s3Object.getObjectContent().readAllBytes();
                s3Object.close();
                
                // Convert to base64
                String base64 = Base64.getEncoder().encodeToString(imageBytes);
                String format = determineImageFormat(imageUrl);
                
                log.info("Successfully converted S3 image to base64 format, size: {} bytes", imageBytes.length);
                return "data:image/" + format + ";base64," + base64;
                
            } catch (IOException e) {
                log.error("Error downloading image from S3: {}", e.getMessage());
                throw new RuntimeException("Failed to download image from S3", e);
            }
        })
        .subscribeOn(Schedulers.boundedElastic())
        .doOnError(error -> log.error("Error in downloadAndEncodeImage: {}", error.getMessage()));
    }

    private String extractS3KeyFromUrl(String s3Url) {
        // S3 URL format: https://bucket-name.s3.region.amazonaws.com/key
        // Example: https://sweet-potato-receipts.s3.ap-south-1.amazonaws.com/receipts/filename.jpg
        // Key should be: receipts/filename.jpg
        
        try {
            String bucketName = configProperties.getAwsBucketName();
            log.debug("Extracting S3 key from URL: {}", s3Url);
            log.debug("Expected bucket name: {}", bucketName);
            
            // Look for the pattern: bucketName.s3.region.amazonaws.com/
            String domainPattern = bucketName + ".s3.";
            int domainStart = s3Url.indexOf(domainPattern);
            
            if (domainStart != -1) {
                // Find the first slash after the domain
                int domainEnd = domainStart + domainPattern.length();
                int regionEnd = s3Url.indexOf(".amazonaws.com/", domainEnd);
                
                if (regionEnd != -1) {
                    // Extract everything after ".amazonaws.com/"
                    String key = s3Url.substring(regionEnd + ".amazonaws.com/".length());
                    log.debug("Extracted S3 key: {}", key);
                    return key;
                }
            }
            
            throw new IllegalArgumentException("Could not extract S3 key from URL: " + s3Url);
        } catch (Exception e) {
            log.error("Error extracting S3 key from URL: {} - {}", s3Url, e.getMessage());
            throw new IllegalArgumentException("Invalid S3 URL format: " + s3Url, e);
        }
    }

    private String determineImageFormat(String imageUrl) {
        String lowerUrl = imageUrl.toLowerCase();
        if (lowerUrl.contains(".png")) {
            return "png";
        } else if (lowerUrl.contains(".gif")) {
            return "gif";
        } else if (lowerUrl.contains(".webp")) {
            return "webp";
        } else {
            return "jpeg"; // default
        }
    }

    private MistralOcrRequest buildMistralRequest(String base64Image) {
        // Use the helper methods to ensure correct structure
        MistralOcrRequest.Content textContent = MistralOcrRequest.Content.text(FUEL_RECEIPT_PROMPT);
        MistralOcrRequest.Content imageContent = MistralOcrRequest.Content.imageUrl(base64Image);

        MistralOcrRequest.Message message = MistralOcrRequest.Message.builder()
                .role("user")
                .content(Arrays.asList(textContent, imageContent))
                .build();

        return MistralOcrRequest.builder()
                .model("pixtral-12b-2409")  // Use exact model name from curl example
                .messages(List.of(message))
                .maxTokens(300)  // Match the curl example
                .build();  // Remove temperature for now to match curl example exactly
    }

    private ExtractedFuelData parseExtractedData(MistralOcrResponse response) {
        try {
            if (response.getChoices() == null || response.getChoices().isEmpty()) {
                log.warn("No choices in Mistral AI response");
                return createEmptyExtractedData(response.toString());
            }

            String jsonContent = response.getChoices().get(0).getMessage().getContent();
            log.info("Raw JSON from Mistral AI: {}", jsonContent);

            // Clean the JSON content (remove any markdown formatting)
            jsonContent = cleanJsonContent(jsonContent);

            // Parse the JSON response
            var jsonNode = objectMapper.readTree(jsonContent);

            return ExtractedFuelData.builder()
                    .stationName(getStringValue(jsonNode, "stationName"))
                    .stationBrand(getStringValue(jsonNode, "stationBrand"))
                    .address(getStringValue(jsonNode, "address"))
                    .city(getStringValue(jsonNode, "city"))
                    .state(getStringValue(jsonNode, "state"))
                    .zipCode(getStringValue(jsonNode, "zipCode"))
                    .totalAmount(getBigDecimalValue(jsonNode, "totalAmount"))
                    .liters(getBigDecimalValue(jsonNode, "liters"))
                    .pricePerLiter(getBigDecimalValue(jsonNode, "pricePerLiter"))
                    .fuelType(getStringValue(jsonNode, "fuelType"))
                    .purchaseDateTime(getDateTimeValue(jsonNode, "purchaseDateTime"))
                    .receiptNumber(getStringValue(jsonNode, "receiptNumber"))
                    .paymentMethod(getStringValue(jsonNode, "paymentMethod"))
                    .confidence(getDoubleValue(jsonNode, "confidence"))
                    .rawText(jsonContent)
                    .build();

        } catch (Exception e) {
            log.error("Error parsing Mistral AI response", e);
            return createEmptyExtractedData(response.toString());
        }
    }

    private String cleanJsonContent(String content) {
        // Remove markdown code blocks if present
        content = content.replaceAll("```json\\s*", "").replaceAll("```\\s*", "");
        // Remove any leading/trailing whitespace
        return content.trim();
    }

    private String getStringValue(JsonNode node, String fieldName) {
        var fieldNode = node.get(fieldName);
        if (fieldNode == null || fieldNode.isNull() || "null".equals(fieldNode.asText())) {
            return null;
        }
        return fieldNode.asText();
    }

    private BigDecimal getBigDecimalValue(JsonNode node, String fieldName) {
        var fieldNode = node.get(fieldName);
        if (fieldNode == null || fieldNode.isNull() || "null".equals(fieldNode.asText())) {
            return null;
        }
        try {
            return new BigDecimal(fieldNode.asText());
        } catch (NumberFormatException e) {
            log.warn("Invalid number format for field {}: {}", fieldName, fieldNode.asText());
            return null;
        }
    }

    private Double getDoubleValue(JsonNode node, String fieldName) {
        var fieldNode = node.get(fieldName);
        if (fieldNode == null || fieldNode.isNull() || "null".equals(fieldNode.asText())) {
            return null;
        }
        try {
            return fieldNode.asDouble();
        } catch (NumberFormatException e) {
            log.warn("Invalid number format for field {}: {}", fieldName, fieldNode.asText());
            return null;
        }
    }

    private LocalDateTime getDateTimeValue(JsonNode node, String fieldName) {
        var fieldNode = node.get(fieldName);
        if (fieldNode == null || fieldNode.isNull() || "null".equals(fieldNode.asText())) {
            return null;
        }
        
        String dateTimeString = fieldNode.asText();
        try {
            // Try parsing ISO format first
            return LocalDateTime.parse(dateTimeString);
        } catch (DateTimeParseException e) {
            // Try common date formats
            List<DateTimeFormatter> formatters = Arrays.asList(
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
                    DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm:ss"),
                    DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
                    DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                    DateTimeFormatter.ofPattern("MM/dd/yyyy"),
                    DateTimeFormatter.ofPattern("dd/MM/yyyy")
            );

            for (DateTimeFormatter formatter : formatters) {
                try {
                    if (dateTimeString.contains(":")) {
                        return LocalDateTime.parse(dateTimeString, formatter);
                    } else {
                        return LocalDateTime.parse(dateTimeString + " 00:00:00", 
                                DateTimeFormatter.ofPattern(formatter.toString() + " HH:mm:ss"));
                    }
                } catch (DateTimeParseException ignored) {
                    // Continue with next formatter
                }
            }
            
            log.warn("Unable to parse date time: {}", dateTimeString);
            return null;
        }
    }

    private ExtractedFuelData createEmptyExtractedData(String rawText) {
        return ExtractedFuelData.builder()
                .confidence(0.0)
                .rawText(rawText)
                .build();
    }
}
