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
    private BigDecimal amount;
    private BigDecimal gallons;
    private BigDecimal pricePerGallon;
    private String receiptImageUrl;
    private String location;
    private LocalDateTime purchaseDate;
    private LocalDateTime createdAt;
    
    // OCR processing details
    private boolean ocrProcessed;
    private String ocrConfidence;
    private String rawOcrData;
}
