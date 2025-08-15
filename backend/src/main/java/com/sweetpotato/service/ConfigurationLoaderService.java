package com.sweetpotato.service;

import com.sweetpotato.dto.config.AppConfiguration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

/**
 * Service that loads configuration from DynamoDB during application startup
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConfigurationLoaderService {
    
    private final DynamoDbConfigService dynamoDbConfigService;
    private AppConfiguration appConfiguration;
    private boolean configurationLoaded = false;
    
    /**
     * Loads configuration during application startup
     */
    @EventListener(ApplicationReadyEvent.class)
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public void loadConfiguration() {
        if (configurationLoaded) {
            log.debug("Configuration already loaded, skipping");
            return;
        }
        
        try {
            log.info("Loading application configuration from DynamoDB...");
            appConfiguration = dynamoDbConfigService.loadConfiguration();
            configurationLoaded = true;
            log.info("Successfully loaded application configuration from DynamoDB");
            
            // Log loaded configuration (without sensitive values)
            logConfigurationSummary();
            
        } catch (Exception e) {
            log.error("Failed to load configuration from DynamoDB", e);
            // In a production environment, you might want to fail fast here
            // For development, we could continue with fallback values
            throw new RuntimeException("Critical error: Could not load application configuration", e);
        }
    }
    
    /**
     * Gets the loaded configuration
     */
    public AppConfiguration getConfiguration() {
        if (!configurationLoaded) {
            log.warn("Configuration not yet loaded, attempting to load now");
            loadConfiguration();
        }
        return appConfiguration;
    }
    
    /**
     * Checks if configuration is loaded
     */
    public boolean isConfigurationLoaded() {
        return configurationLoaded;
    }
    
    /**
     * Reloads configuration from DynamoDB
     */
    public void reloadConfiguration() {
        log.info("Reloading application configuration from DynamoDB...");
        try {
            appConfiguration = dynamoDbConfigService.loadConfiguration();
            configurationLoaded = true;
            log.info("Successfully reloaded application configuration from DynamoDB");
            logConfigurationSummary();
        } catch (Exception e) {
            log.error("Failed to reload configuration from DynamoDB", e);
            throw new RuntimeException("Failed to reload application configuration", e);
        }
    }
    
    /**
     * Logs a summary of loaded configuration (without sensitive values)
     */
    private void logConfigurationSummary() {
        if (appConfiguration == null) {
            log.warn("No configuration to summarize");
            return;
        }
        
        StringBuilder summary = new StringBuilder("Configuration Summary:");
        
        // JWT Configuration
        if (appConfiguration.getJwt() != null) {
            summary.append("\n  JWT: ");
            summary.append("secret=").append(appConfiguration.getJwt().getSecret() != null ? "[LOADED]" : "[MISSING]");
            summary.append(", expiration=").append(appConfiguration.getJwt().getExpiration());
            summary.append(", refreshExpiration=").append(appConfiguration.getJwt().getRefreshExpiration());
        }
        
        // AWS Configuration
        if (appConfiguration.getAws() != null) {
            summary.append("\n  AWS: ");
            summary.append("accessKey=").append(appConfiguration.getAws().getAccessKey() != null ? "[LOADED]" : "[MISSING]");
            summary.append(", secretKey=").append(appConfiguration.getAws().getSecretKey() != null ? "[LOADED]" : "[MISSING]");
            summary.append(", region=").append(appConfiguration.getAws().getRegion());
            summary.append(", bucketName=").append(appConfiguration.getAws().getBucketName());
        }
        
        // Mistral Configuration
        if (appConfiguration.getMistral() != null) {
            summary.append("\n  Mistral: ");
            summary.append("apiUrl=").append(appConfiguration.getMistral().getApiUrl());
            summary.append(", apiKey=").append(appConfiguration.getMistral().getApiKey() != null ? "[LOADED]" : "[MISSING]");
        }
        
        log.info(summary.toString());
    }
}
