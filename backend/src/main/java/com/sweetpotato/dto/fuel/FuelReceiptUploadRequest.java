package com.sweetpotato.dto.fuel;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.constraints.NotNull;

@Data
public class FuelReceiptUploadRequest {
    
    @NotNull(message = "Receipt image is required")
    private MultipartFile receiptImage;
    
    // Optional fields that user can provide if they want to override OCR results
    private String stationName;
    private String stationBrand;
    private String location;
    private String purchaseDate; // ISO format expected
}
