package com.sweetpotato.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sweetpotato.dto.fuel.ExtractedFuelData;
import com.sweetpotato.dto.fuel.FuelReceiptResponse;
import com.sweetpotato.dto.fuel.FuelReceiptUploadRequest;
import com.sweetpotato.entity.FuelRecord;
import com.sweetpotato.entity.User;
import com.sweetpotato.repository.FuelRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class FuelRecordService {

    private final FuelRecordRepository fuelRecordRepository;
    private final S3UploadService s3UploadService;
    private final MistralOcrService mistralOcrService;
    private final ObjectMapper objectMapper;

    public Mono<FuelReceiptResponse> processReceiptUpload(FuelReceiptUploadRequest request, User user) {
        log.info("Processing fuel receipt upload for user: {}", user.getId());

        return uploadImageAndProcessOcr(request.getReceiptImage())
                .map(result -> {
                    ExtractedFuelData extractedData = result.extractedData;
                    String imageUrl = result.imageUrl;

                    FuelRecord fuelRecord = createFuelRecordFromExtractedData(extractedData, user, imageUrl);
                    
                    // Override with user-provided data if available
                    if (request.getStationName() != null) {
                        fuelRecord.setStationName(request.getStationName());
                    }
                    if (request.getLocation() != null) {
                        fuelRecord.setLocation(request.getLocation());
                    }
                    if (request.getPurchaseDate() != null) {
                        fuelRecord.setPurchaseDate(parseDateTime(request.getPurchaseDate()));
                    }

                    FuelRecord savedRecord = fuelRecordRepository.save(fuelRecord);
                    log.info("Saved fuel record with ID: {}", savedRecord.getId());

                    return mapToResponse(savedRecord, extractedData);
                })
                .doOnError(error -> log.error("Error processing fuel receipt upload", error));
    }

    private Mono<ProcessingResult> uploadImageAndProcessOcr(MultipartFile receiptImage) {
        try {
            String imageUrl = s3UploadService.uploadReceiptImage(receiptImage);
            log.info("Image uploaded to S3: {}", imageUrl);

            return mistralOcrService.processReceiptImage(imageUrl)
                    .map(extractedData -> new ProcessingResult(imageUrl, extractedData))
                    .doOnError(ocrError -> {
                        log.error("OCR processing failed, but image was uploaded: {}", imageUrl, ocrError);
                        // Don't delete the image, user can still manually enter data
                    });
        } catch (IOException e) {
            log.error("Failed to upload image to S3", e);
            return Mono.error(new RuntimeException("Failed to upload receipt image", e));
        }
    }

    private FuelRecord createFuelRecordFromExtractedData(ExtractedFuelData extractedData, User user, String imageUrl) {
        FuelRecord.FuelRecordBuilder builder = FuelRecord.builder()
                .user(user)
                .receiptImageUrl(imageUrl);

        if (extractedData != null) {
            builder
                .stationName(extractedData.getStationName())
                .amount(extractedData.getTotalAmount())
                .liters(extractedData.getLiters())
                .pricePerLiter(extractedData.getPricePerLiter())
                .location(buildLocationString(extractedData))
                .purchaseDate(extractedData.getPurchaseDateTime());

            // Store the full extracted data as JSON
            try {
                builder.extractedData(objectMapper.writeValueAsString(extractedData));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize extracted data to JSON", e);
                builder.extractedData(extractedData.getRawText());
            }
        }

        return builder.build();
    }

    private String buildLocationString(ExtractedFuelData extractedData) {
        StringBuilder location = new StringBuilder();
        
        if (extractedData.getAddress() != null) {
            location.append(extractedData.getAddress());
        }
        
        if (extractedData.getCity() != null) {
            if (location.length() > 0) location.append(", ");
            location.append(extractedData.getCity());
        }
        
        if (extractedData.getState() != null) {
            if (location.length() > 0) location.append(", ");
            location.append(extractedData.getState());
        }
        
        if (extractedData.getZipCode() != null) {
            if (location.length() > 0) location.append(" ");
            location.append(extractedData.getZipCode());
        }
        
        return location.length() > 0 ? location.toString() : null;
    }

    private LocalDateTime parseDateTime(String dateTimeString) {
        try {
            return LocalDateTime.parse(dateTimeString, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            log.warn("Failed to parse date time: {}", dateTimeString);
            return LocalDateTime.now();
        }
    }

    private FuelReceiptResponse mapToResponse(FuelRecord fuelRecord, ExtractedFuelData extractedData) {
        return FuelReceiptResponse.builder()
                .id(fuelRecord.getId())
                .stationName(fuelRecord.getStationName())
                .amount(fuelRecord.getAmount())
                .gallons(fuelRecord.getLiters())
                .pricePerGallon(fuelRecord.getPricePerLiter())
                .receiptImageUrl(fuelRecord.getReceiptImageUrl())
                .location(fuelRecord.getLocation())
                .purchaseDate(fuelRecord.getPurchaseDate())
                .createdAt(fuelRecord.getCreatedAt())
                .ocrProcessed(extractedData != null)
                .ocrConfidence(extractedData != null && extractedData.getConfidence() != null ? 
                    extractedData.getConfidence().toString() : null)
                .rawOcrData(extractedData != null ? extractedData.getRawText() : null)
                .build();
    }

    public Page<FuelReceiptResponse> getUserFuelRecords(Long userId, Pageable pageable) {
        Page<FuelRecord> records = fuelRecordRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return records.map(record -> mapToResponse(record, null));
    }

    public Optional<FuelReceiptResponse> getFuelRecordById(Long id, Long userId) {
        return fuelRecordRepository.findById(id)
                .filter(record -> record.getUser().getId().equals(userId))
                .map(record -> mapToResponse(record, null));
    }

    @Transactional
    public boolean deleteFuelRecord(Long id, Long userId) {
        Optional<FuelRecord> recordOpt = fuelRecordRepository.findById(id)
                .filter(record -> record.getUser().getId().equals(userId));

        if (recordOpt.isPresent()) {
            FuelRecord record = recordOpt.get();
            
            // Delete image from S3 if it exists
            if (record.getReceiptImageUrl() != null) {
                try {
                    s3UploadService.deleteFile(record.getReceiptImageUrl());
                } catch (Exception e) {
                    log.warn("Failed to delete image from S3: {}", record.getReceiptImageUrl(), e);
                    // Continue with record deletion even if S3 deletion fails
                }
            }
            
            fuelRecordRepository.delete(record);
            log.info("Deleted fuel record with ID: {}", id);
            return true;
        }
        
        return false;
    }

    // Helper class for processing results
    private static class ProcessingResult {
        final String imageUrl;
        final ExtractedFuelData extractedData;

        ProcessingResult(String imageUrl, ExtractedFuelData extractedData) {
            this.imageUrl = imageUrl;
            this.extractedData = extractedData;
        }
    }
}
