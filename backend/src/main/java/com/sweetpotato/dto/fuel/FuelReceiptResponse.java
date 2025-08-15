package com.sweetpotato.dto.fuel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FuelReceiptResponse {
    
    private Long id;
    private String stationName;
    private String stationBrand;
    private String fuelType;
    private BigDecimal amount;
    private BigDecimal liters;
    private BigDecimal pricePerLiter;
    private String receiptImageUrl;
    private String location;
    private LocalDateTime purchaseDate;
    private LocalDateTime createdAt;
    
    // OCR processing details
    private boolean ocrProcessed;
    private String ocrConfidence;
    private String rawOcrData;
    
    // Brand logo URL
    private String brandLogoUrl;
}
