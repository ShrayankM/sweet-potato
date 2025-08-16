package com.sweetpotato.config;

import com.sweetpotato.dto.config.AppConfiguration;
import com.sweetpotato.service.ConfigurationLoaderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Configuration properties that are loaded dynamically from DynamoDB
 * This class provides access to configuration values for other services
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DynamicConfigurationProperties {
    
    private final ConfigurationLoaderService configurationLoaderService;
    
    /**
     * Gets JWT secret
     */
    public String getJwtSecret() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        String secret = config != null && config.getJwt() != null ? config.getJwt().getSecret() : null;
        if (secret == null) {
            log.error("JWT secret not found in configuration!");
            throw new IllegalStateException("JWT secret is required but not configured");
        }
        return secret;
    }
    
    /**
     * Gets JWT expiration
     */
    public Long getJwtExpiration() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        return config != null && config.getJwt() != null ? config.getJwt().getExpiration() : 86400000L;
    }
    
    /**
     * Gets JWT refresh expiration
     */
    public Long getJwtRefreshExpiration() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        return config != null && config.getJwt() != null ? config.getJwt().getRefreshExpiration() : 604800000L;
    }
    
    /**
     * Gets AWS access key
     */
    public String getAwsAccessKey() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        String accessKey = config != null && config.getAws() != null ? config.getAws().getAccessKey() : null;
        if (accessKey == null) {
            log.error("AWS access key not found in configuration!");
            throw new IllegalStateException("AWS access key is required but not configured");
        }
        return accessKey;
    }
    
    /**
     * Gets AWS secret key
     */
    public String getAwsSecretKey() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        String secretKey = config != null && config.getAws() != null ? config.getAws().getSecretKey() : null;
        if (secretKey == null) {
            log.error("AWS secret key not found in configuration!");
            throw new IllegalStateException("AWS secret key is required but not configured");
        }
        return secretKey;
    }
    
    /**
     * Gets AWS region
     */
    public String getAwsRegion() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        return config != null && config.getAws() != null ? config.getAws().getRegion() : "ap-south-1";
    }
    
    /**
     * Gets AWS S3 bucket name
     */
    public String getAwsBucketName() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        return config != null && config.getAws() != null ? config.getAws().getBucketName() : "sweet-potato-receipts";
    }
    
    /**
     * Gets AWS S3 bucket name for fuel brand logos
     */
    public String getAwsFuelLogosBucketName() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        return config != null && config.getAws() != null ? config.getAws().getFuelLogosBucketName() : "fuel-company-logos";
    }
    
    /**
     * Gets SES from email address
     */
    public String getSesFromEmail() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        String fromEmail = config != null && config.getAws() != null ? config.getAws().getSesFromEmail() : null;
        if (fromEmail == null) {
            log.error("SES from email not found in configuration!");
            throw new IllegalStateException("SES from email is required but not configured");
        }
        return fromEmail;
    }
    
    /**
     * Gets SES reply-to email address
     */
    public String getSesReplyToEmail() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        return config != null && config.getAws() != null ? config.getAws().getSesReplyToEmail() : getSesFromEmail();
    }
    
    /**
     * Gets application name
     */
    public String getAppName() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        return config != null && config.getAws() != null ? config.getAws().getAppName() : "Sweet Potato";
    }
    
    /**
     * Gets Mistral API URL
     */
    public String getMistralApiUrl() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        return config != null && config.getMistral() != null ? config.getMistral().getApiUrl() : "https://api.mistral.ai/v1";
    }
    
    /**
     * Gets Mistral API key
     */
    public String getMistralApiKey() {
        AppConfiguration config = configurationLoaderService.getConfiguration();
        String apiKey = config != null && config.getMistral() != null ? config.getMistral().getApiKey() : null;
        if (apiKey == null) {
            log.error("Mistral API key not found in configuration!");
            throw new IllegalStateException("Mistral API key is required but not configured");
        }
        return apiKey;
    }
}
