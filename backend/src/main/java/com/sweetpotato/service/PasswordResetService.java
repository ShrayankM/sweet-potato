package com.sweetpotato.service;

import com.sweetpotato.entity.User;
import com.sweetpotato.exception.InvalidCredentialsException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final UserService userService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    
    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int MAX_RESET_ATTEMPTS = 3;
    private static final int RATE_LIMIT_MINUTES = 15;

    @Transactional
    public void initiatePasswordReset(String email) {
        log.info("Initiating password reset for email: {}", email);
        
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.warn("Password reset requested for non-existent email: {}", email);
            // Don't reveal if email exists or not for security
            return;
        }
        
        User user = userOpt.get();
        
        // Check rate limiting
        if (isRateLimited(user)) {
            log.warn("Rate limit exceeded for password reset attempts: {}", email);
            throw new InvalidCredentialsException("Too many password reset requests. Please try again later.");
        }
        
        // Generate OTP
        String otp = generateOtp();
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);
        
        // Update user with reset token
        user.setPasswordResetToken(passwordEncoder.encode(otp));
        user.setPasswordResetTokenExpiry(expiry);
        user.setPasswordResetAttempts(0);
        user.setLastPasswordResetRequest(LocalDateTime.now());
        
        userService.save(user);
        
        // Send OTP via email
        emailService.sendPasswordResetOtp(email, otp, user.getUsername());
        
        log.info("Password reset OTP sent for email: {}", email);
    }

    @Transactional(readOnly = true)
    public boolean verifyOtp(String email, String otp) {
        log.info("Verifying OTP for email: {}", email);
        
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.warn("OTP verification attempted for non-existent email: {}", email);
            return false;
        }
        
        User user = userOpt.get();
        
        // Check if reset token exists and is not expired
        if (user.getPasswordResetToken() == null || 
            user.getPasswordResetTokenExpiry() == null ||
            LocalDateTime.now().isAfter(user.getPasswordResetTokenExpiry())) {
            log.warn("Invalid or expired reset token for email: {}", email);
            return false;
        }
        
        // Check if max attempts exceeded
        if (user.getPasswordResetAttempts() >= MAX_RESET_ATTEMPTS) {
            log.warn("Maximum OTP verification attempts exceeded for email: {}", email);
            return false;
        }
        
        // Verify OTP
        boolean otpValid = passwordEncoder.matches(otp, user.getPasswordResetToken());
        
        if (!otpValid) {
            // Increment failed attempts
            user.setPasswordResetAttempts(user.getPasswordResetAttempts() + 1);
            userService.save(user);
            log.warn("Invalid OTP provided for email: {}", email);
        }
        
        return otpValid;
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        log.info("Resetting password for email: {}", email);
        
        if (!verifyOtp(email, otp)) {
            throw new InvalidCredentialsException("Invalid or expired OTP");
        }
        
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new InvalidCredentialsException("User not found");
        }
        
        User user = userOpt.get();
        
        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        
        // Clear reset token data
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        user.setPasswordResetAttempts(0);
        user.setLastPasswordResetRequest(null);
        
        userService.save(user);
        
        // Send confirmation email
        emailService.sendPasswordResetConfirmation(email, user.getUsername());
        
        log.info("Password reset completed successfully for email: {}", email);
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        StringBuilder otp = new StringBuilder();
        
        for (int i = 0; i < OTP_LENGTH; i++) {
            otp.append(random.nextInt(10));
        }
        
        return otp.toString();
    }

    private boolean isRateLimited(User user) {
        if (user.getLastPasswordResetRequest() == null) {
            return false;
        }
        
        LocalDateTime rateLimitExpiry = user.getLastPasswordResetRequest().plusMinutes(RATE_LIMIT_MINUTES);
        return LocalDateTime.now().isBefore(rateLimitExpiry);
    }
}
