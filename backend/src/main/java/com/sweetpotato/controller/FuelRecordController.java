package com.sweetpotato.controller;

import com.sweetpotato.dto.fuel.FuelReceiptResponse;
import com.sweetpotato.dto.fuel.FuelReceiptUploadRequest;
import com.sweetpotato.entity.User;
import com.sweetpotato.service.FuelRecordService;
import com.sweetpotato.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Mono;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.Optional;

@RestController
@RequestMapping("/fuel-records")
@RequiredArgsConstructor
@Slf4j
public class FuelRecordController {

    private final FuelRecordService fuelRecordService;
    private final UserService userService;

    @PostMapping(value = "/upload-receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ResponseEntity<FuelReceiptResponse>> uploadReceipt(
            @RequestPart("receiptImage") MultipartFile receiptImage,
            @RequestPart(value = "stationName", required = false) String stationName,
            @RequestPart(value = "location", required = false) String location,
            @RequestPart(value = "purchaseDate", required = false) String purchaseDate) {

        log.info("Receipt upload request received. Image size: {} bytes", receiptImage.getSize());

        // Validate file
        if (receiptImage.isEmpty()) {
            return Mono.just(ResponseEntity.badRequest().build());
        }

        // Validate file type
        String contentType = receiptImage.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            log.warn("Invalid file type received: {}", contentType);
            return Mono.just(ResponseEntity.badRequest().build());
        }

        // Validate file size (max 10MB)
        if (receiptImage.getSize() > 10 * 1024 * 1024) {
            log.warn("File size too large: {} bytes", receiptImage.getSize());
            return Mono.just(ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).build());
        }

        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }

        // Create request object
        FuelReceiptUploadRequest request = new FuelReceiptUploadRequest();
        request.setReceiptImage(receiptImage);
        request.setStationName(stationName);
        request.setLocation(location);
        request.setPurchaseDate(purchaseDate);

        return fuelRecordService.processReceiptUpload(request, currentUser)
                .map(response -> ResponseEntity.ok(response))
                .onErrorReturn(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build());
    }

    @GetMapping
    public ResponseEntity<Page<FuelReceiptResponse>> getUserFuelRecords(
            @RequestParam(defaultValue = "0") @Min(0) Integer page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) Integer size) {

        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<FuelReceiptResponse> records = fuelRecordService.getUserFuelRecords(currentUser.getId(), pageable);
        
        return ResponseEntity.ok(records);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FuelReceiptResponse> getFuelRecord(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<FuelReceiptResponse> record = fuelRecordService.getFuelRecordById(id, currentUser.getId());
        
        return record.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFuelRecord(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean deleted = fuelRecordService.deleteFuelRecord(id, currentUser.getId());
        
        if (deleted) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            log.warn("No authenticated user found");
            return null;
        }

        String email = authentication.getName();
        return userService.findByEmail(email).orElse(null);
    }
}
