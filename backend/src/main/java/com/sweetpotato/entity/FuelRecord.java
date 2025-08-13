package com.sweetpotato.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fuel_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FuelRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull(message = "User is required")
    private User user;

    @Column(name = "station_name")
    private String stationName;

    @Column(name = "amount", precision = 10, scale = 2)
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    @Column(name = "gallons", precision = 10, scale = 3)
    @Positive(message = "Gallons must be positive")
    private BigDecimal gallons;

    @Column(name = "price_per_gallon", precision = 10, scale = 3)
    private BigDecimal pricePerGallon;

    @Column(name = "receipt_image_url")
    private String receiptImageUrl;

    @Column(name = "extracted_data", columnDefinition = "TEXT")
    private String extractedData; // JSON string of OCR extracted data

    @Column(name = "purchase_date")
    private LocalDateTime purchaseDate;

    @Column(name = "location")
    private String location; // Station address/location

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        
        // Calculate price per gallon if not provided
        if (pricePerGallon == null && amount != null && gallons != null && 
            gallons.compareTo(BigDecimal.ZERO) > 0) {
            pricePerGallon = amount.divide(gallons, 3, java.math.RoundingMode.HALF_UP);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        
        // Recalculate price per gallon if amount or gallons changed
        if (amount != null && gallons != null && gallons.compareTo(BigDecimal.ZERO) > 0) {
            pricePerGallon = amount.divide(gallons, 3, java.math.RoundingMode.HALF_UP);
        }
    }
}
