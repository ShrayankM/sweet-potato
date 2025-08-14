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
public class ExtractedFuelData {
    
    private String stationName;
    private String stationBrand;
    private String address;
    private BigDecimal totalAmount;
    private BigDecimal liters;
    private BigDecimal pricePerLiter;
    private String fuelType; // Regular, Premium, Diesel, etc.
    private LocalDateTime purchaseDateTime;
    private String receiptNumber;
    private String paymentMethod;
    
    // Confidence metrics from OCR
    private Double confidence;
    private String rawText;
    
    // Location details
    private String city;
    private String state;
    private String zipCode;
}
