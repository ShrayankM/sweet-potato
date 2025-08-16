package com.sweetpotato.service;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.simpleemail.AmazonSimpleEmailService;
import com.amazonaws.services.simpleemail.AmazonSimpleEmailServiceClientBuilder;
import com.amazonaws.services.simpleemail.model.*;
import com.sweetpotato.config.DynamicConfigurationProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final DynamicConfigurationProperties configProperties;

    private AmazonSimpleEmailService getSESClient() {
        BasicAWSCredentials credentials = new BasicAWSCredentials(
                configProperties.getAwsAccessKey(),
                configProperties.getAwsSecretKey()
        );
        
        return AmazonSimpleEmailServiceClientBuilder.standard()
                .withRegion(Regions.fromName(configProperties.getAwsRegion()))
                .withCredentials(new AWSStaticCredentialsProvider(credentials))
                .build();
    }

    public void sendPasswordResetOtp(String toEmail, String otp, String userName) {
        try {
            log.info("Sending password reset OTP to email: {}", toEmail);
            
            String subject = configProperties.getAppName() + " - Password Reset OTP";
            String htmlBody = buildPasswordResetEmailHtml(userName, otp);
            String textBody = buildPasswordResetEmailText(userName, otp);
            
            sendEmail(toEmail, subject, htmlBody, textBody);
            
            log.info("Password reset OTP sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset OTP to: {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }
    
    public void sendPasswordResetConfirmation(String toEmail, String userName) {
        try {
            log.info("Sending password reset confirmation to email: {}", toEmail);
            
            String subject = configProperties.getAppName() + " - Password Reset Successful";
            String htmlBody = buildPasswordResetConfirmationHtml(userName);
            String textBody = buildPasswordResetConfirmationText(userName);
            
            sendEmail(toEmail, subject, htmlBody, textBody);
            
            log.info("Password reset confirmation sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset confirmation to: {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset confirmation", e);
        }
    }

    private void sendEmail(String toEmail, String subject, String htmlBody, String textBody) {
        AmazonSimpleEmailService sesClient = getSESClient();
        
        SendEmailRequest request = new SendEmailRequest()
                .withDestination(new Destination().withToAddresses(toEmail))
                .withMessage(new Message()
                        .withBody(new Body()
                                .withHtml(new Content().withCharset("UTF-8").withData(htmlBody))
                                .withText(new Content().withCharset("UTF-8").withData(textBody)))
                        .withSubject(new Content().withCharset("UTF-8").withData(subject)))
                .withSource(configProperties.getSesFromEmail())
                .withReplyToAddresses(configProperties.getSesReplyToEmail());
                
        sesClient.sendEmail(request);
    }

    private String buildPasswordResetEmailHtml(String userName, String otp) {
        String appName = configProperties.getAppName();
        return String.format("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4CAF50;">%s - Password Reset</h2>
                    <p>Hello %s,</p>
                    <p>We received a request to reset your password for your %s account.</p>
                    <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center; border-radius: 5px;">
                        <h3 style="margin: 0; color: #4CAF50;">Your OTP Code</h3>
                        <p style="font-size: 32px; font-weight: bold; color: #333; margin: 10px 0; letter-spacing: 5px;">%s</p>
                        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes</p>
                    </div>
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This OTP is valid for 10 minutes only</li>
                        <li>Don't share this code with anyone</li>
                        <li>If you didn't request this, please ignore this email</li>
                    </ul>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from %s. Please do not reply to this email.
                    </p>
                </div>
            </body>
            </html>
            """, appName, userName, appName, otp, appName);
    }

    private String buildPasswordResetEmailText(String userName, String otp) {
        String appName = configProperties.getAppName();
        return String.format("""
            Hello %s,

            We received a request to reset your password for your %s account.

            Your OTP Code: %s

            This code will expire in 10 minutes.

            Important:
            - This OTP is valid for 10 minutes only
            - Don't share this code with anyone
            - If you didn't request this, please ignore this email

            This is an automated message from %s.
            """, userName, appName, otp, appName);
    }

    private String buildPasswordResetConfirmationHtml(String userName) {
        String appName = configProperties.getAppName();
        return String.format("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4CAF50;">%s - Password Reset Successful</h2>
                    <p>Hello %s,</p>
                    <p>Your password has been successfully reset for your %s account.</p>
                    <div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #4CAF50;">
                        <p style="margin: 0; color: #2e7d32;"><strong>✓ Password Reset Complete</strong></p>
                        <p style="margin: 5px 0 0 0; color: #2e7d32;">You can now log in with your new password.</p>
                    </div>
                    <p>If you didn't make this change, please contact our support team immediately.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from %s. Please do not reply to this email.
                    </p>
                </div>
            </body>
            </html>
            """, appName, userName, appName, appName);
    }

    private String buildPasswordResetConfirmationText(String userName) {
        String appName = configProperties.getAppName();
        return String.format("""
            Hello %s,

            Your password has been successfully reset for your %s account.

            You can now log in with your new password.

            If you didn't make this change, please contact our support team immediately.

            This is an automated message from %s.
            """, userName, appName, appName);
    }
}
