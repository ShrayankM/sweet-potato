package com.sweetpotato.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sweetpotato.dto.fuel.ExtractedFuelData;
import com.sweetpotato.dto.fuel.MistralOcrRequest;
import com.sweetpotato.dto.fuel.MistralOcrResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class MistralOcrService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${mistral.api.url}")
    private String mistralApiUrl;

    @Value("${mistral.api.key}")
    private String mistralApiKey;

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
            "gallons": "Number of gallons purchased (number only)",
            "pricePerGallon": "Price per gallon (number only)",
            "fuelType": "Type of fuel (Regular, Premium, Diesel, etc.)",
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

        MistralOcrRequest request = buildMistralRequest(imageUrl);
        
        return webClientBuilder.build()
                .post()
                .uri(mistralApiUrl + "/chat/completions")
                .header("Authorization", "Bearer " + mistralApiKey)
                .header("Content-Type", "application/json")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(MistralOcrResponse.class)
                .doOnNext(response -> log.info("Received Mistral AI response: {}", response))
                .map(this::parseExtractedData)
                .doOnError(error -> log.error("Error calling Mistral AI API", error));
    }

    private MistralOcrRequest buildMistralRequest(String imageUrl) {
        MistralOcrRequest.Content textContent = MistralOcrRequest.Content.builder()
                .type("text")
                .text(FUEL_RECEIPT_PROMPT)
                .build();

        MistralOcrRequest.Content imageContent = MistralOcrRequest.Content.builder()
                .type("image_url")
                .imageUrl(MistralOcrRequest.ImageUrl.builder().url(imageUrl).build())
                .build();

        MistralOcrRequest.Message message = MistralOcrRequest.Message.builder()
                .role("user")
                .content(Arrays.asList(textContent, imageContent))
                .build();

        return MistralOcrRequest.builder()
                .model("pixtral-12b-2409")
                .messages(List.of(message))
                .maxTokens(1000)
                .temperature(0.1)
                .build();
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
                    .gallons(getBigDecimalValue(jsonNode, "gallons"))
                    .pricePerGallon(getBigDecimalValue(jsonNode, "pricePerGallon"))
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

    private String getStringValue(com.fasterxml.jackson.databind.JsonNode node, String fieldName) {
        var fieldNode = node.get(fieldName);
        if (fieldNode == null || fieldNode.isNull() || "null".equals(fieldNode.asText())) {
            return null;
        }
        return fieldNode.asText();
    }

    private BigDecimal getBigDecimalValue(com.fasterxml.jackson.databind.JsonNode node, String fieldName) {
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

    private Double getDoubleValue(com.fasterxml.jackson.databind.JsonNode node, String fieldName) {
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

    private LocalDateTime getDateTimeValue(com.fasterxml.jackson.databind.JsonNode node, String fieldName) {
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
