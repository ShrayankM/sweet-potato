package com.sweetpotato.controller;

import com.sweetpotato.dto.auth.AuthResponse;
import com.sweetpotato.dto.auth.LoginRequest;
import com.sweetpotato.dto.auth.RefreshTokenRequest;
import com.sweetpotato.dto.auth.RegisterRequest;
import com.sweetpotato.dto.auth.ForgotPasswordRequest;
import com.sweetpotato.dto.auth.VerifyOtpRequest;
import com.sweetpotato.dto.auth.ResetPasswordRequest;
import com.sweetpotato.service.AuthService;
import com.sweetpotato.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        log.info("Registration request received for email: {}", request.getEmail());
        AuthResponse response = authService.register(request);
        log.info("Registration response: {}", response);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        log.info("Login request received for email: {}", request.getEmail());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        log.info("Token refresh request received");
        String newToken = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(Map.of("token", newToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        // In a stateless JWT system, logout is handled client-side
        // by removing the token from storage.
        // Here we just return a success message.
        log.info("Logout request received");
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        log.info("Forgot password request received for email: {}", request.getEmail());
        passwordResetService.initiatePasswordReset(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "If the email exists, an OTP has been sent"));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request
    ) {
        log.info("OTP verification request received for email: {}", request.getEmail());
        boolean valid = passwordResetService.verifyOtp(request.getEmail(), request.getOtp());
        
        if (valid) {
            return ResponseEntity.ok(Map.of("message", "OTP verified successfully"));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired OTP"));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        log.info("Password reset request received for email: {}", request.getEmail());
        passwordResetService.resetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }
}
