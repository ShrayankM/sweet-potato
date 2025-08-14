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

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/fuel-records")
@RequiredArgsConstructor
@Slf4j
public class FuelRecordController {

    private final FuelRecordService fuelRecordService;
    private final UserService userService;
    
    // Thread-safe set to track recent uploads and prevent duplicates
    private final Set<String> recentUploads = ConcurrentHashMap.newKeySet();

    @PostMapping(value = "/upload-receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FuelReceiptResponse> uploadReceipt(
            @RequestPart("receiptImage") MultipartFile receiptImage,
            @RequestPart(value = "stationName", required = false) String stationName,
            @RequestPart(value = "location", required = false) String location,
            @RequestPart(value = "purchaseDate", required = false) String purchaseDate,
            HttpServletRequest request) {

        log.info("📤 Receipt upload request received. Image size: {} bytes, Content-Type: {}", 
                receiptImage.getSize(), receiptImage.getContentType());
        log.debug("Request headers: User-Agent: {}, Authorization: {}", 
                request.getHeader("User-Agent"), 
                request.getHeader("Authorization") != null ? "Bearer [present]" : "null");

        // Check for duplicate requests using file size + current user + time window
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            log.error("❌ UNAUTHORIZED - No authenticated user found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        log.info("👤 Processing upload for user: {} ({})", currentUser.getEmail(), currentUser.getId());
        
        // Create unique request ID based on user ID, file size, and 10-second time window
        long timeWindow = System.currentTimeMillis() / 10000; // 10-second windows
        String requestId = currentUser.getId() + "_" + receiptImage.getSize() + "_" + timeWindow;
        
        if (recentUploads.contains(requestId)) {
            log.warn("🚫 DUPLICATE - Upload request blocked for user: {}, request ID: {}, file size: {} bytes", 
                    currentUser.getId(), requestId, receiptImage.getSize());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }
        
        // Add request ID to prevent duplicates
        recentUploads.add(requestId);
        
        // Clean up old entries periodically (keep memory usage reasonable)
        if (recentUploads.size() > 1000) {
            log.debug("🧹 Cleaning up old upload request IDs");
            recentUploads.clear();
        }

        // Validate file
        if (receiptImage.isEmpty()) {
            log.error("❌ VALIDATION - Empty file received");
            recentUploads.remove(requestId); // Remove from tracking since it failed
            return ResponseEntity.badRequest().build();
        }

        // Validate file type
        String contentType = receiptImage.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            log.warn("❌ VALIDATION - Invalid file type received: {}", contentType);
            recentUploads.remove(requestId); // Remove from tracking since it failed
            return ResponseEntity.badRequest().build();
        }

        // Validate file size (max 10MB)
        if (receiptImage.getSize() > 10 * 1024 * 1024) {
            log.warn("❌ VALIDATION - File size too large: {} bytes", receiptImage.getSize());
            recentUploads.remove(requestId); // Remove from tracking since it failed
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).build();
        }

        log.info("✅ VALIDATION - File passed all validation checks");

        // Create request object
        FuelReceiptUploadRequest uploadRequest = new FuelReceiptUploadRequest();
        uploadRequest.setReceiptImage(receiptImage);
        uploadRequest.setStationName(stationName);
        uploadRequest.setLocation(location);
        uploadRequest.setPurchaseDate(purchaseDate);

        log.info("🚀 STARTING - Synchronous processing for user: {}", currentUser.getId());

        try {
            // Convert reactive to synchronous with timeout
            FuelReceiptResponse result = fuelRecordService.processReceiptUpload(uploadRequest, currentUser)
                    .block(Duration.ofSeconds(45)); // Wait max 45 seconds
            
            if (result != null) {
                log.info("✅ SUCCESS - Got result: ID={}, Amount={}", result.getId(), result.getAmount());
                recentUploads.remove(requestId);
                
                // Log the exact response being sent
                log.info("📤 SENDING RESPONSE - Status: 200 OK, Body: {}", result);
                return ResponseEntity.ok(result);
            } else {
                log.error("❌ ERROR - processReceiptUpload returned null");
                recentUploads.remove(requestId);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
        } catch (Exception e) {
            log.error("❌ EXCEPTION - Error during synchronous processing", e);
            recentUploads.remove(requestId);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Test endpoint to validate JWT authentication
    @GetMapping("/auth-test")
    public ResponseEntity<String> testAuthentication() {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication failed - no user found");
        }
        
        return ResponseEntity.ok("Authentication successful for user: " + currentUser.getEmail() + 
                                " (ID: " + currentUser.getId() + ")");
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
        if (authentication == null || authentication.getPrincipal() == null) {
            log.warn("No authenticated user found");
            return null;
        }

        // Get the User object directly from the authentication principal
        Object principal = authentication.getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }

        log.warn("Authentication principal is not a User object: {}", principal.getClass());
        return null;
    }
}
