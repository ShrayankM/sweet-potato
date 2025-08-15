package com.sweetpotato.service;

import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.model.AttributeValue;
import com.amazonaws.services.dynamodbv2.model.GetItemRequest;
import com.amazonaws.services.dynamodbv2.model.GetItemResult;
import com.amazonaws.services.dynamodbv2.model.ScanRequest;
import com.amazonaws.services.dynamodbv2.model.ScanResult;
import com.sweetpotato.dto.config.AppConfiguration;
import com.sweetpotato.dto.config.ConfigurationItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for fetching configuration from DynamoDB
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DynamoDbConfigService {
    
    private final AmazonDynamoDB dynamoDBClient;
    
    @Value("${app.config.dynamodb.table-name:sweet-potato-config}")
    private String configTableName;
    
    @Value("${app.config.environment:dev}")
    private String environment;
    
    // This should be stored securely, perhaps in AWS Systems Manager Parameter Store
    @Value("${app.config.encryption.key:defaultEncryptionKey1234567890123456}")
    private String encryptionKey;
    
    /**
     * Loads all configuration for the current environment
     */
    public AppConfiguration loadConfiguration() {
        try {
            log.info("Loading configuration from DynamoDB for environment: {}", environment);
            
            Map<String, ConfigurationItem> configs = loadAllConfigurations();
            
            return AppConfiguration.builder()
                    .jwt(buildJwtConfiguration(configs))
                    .aws(buildAwsConfiguration(configs))
                    .mistral(buildMistralConfiguration(configs))
                    .build();
                    
        } catch (Exception e) {
            log.error("Error loading configuration from DynamoDB", e);
            throw new RuntimeException("Failed to load application configuration", e);
        }
    }
    
    /**
     * Loads all configuration items for the current environment
     */
    private Map<String, ConfigurationItem> loadAllConfigurations() {
        try {
            ScanRequest scanRequest = new ScanRequest()
                    .withTableName(configTableName)
                    .withFilterExpression("#env = :environment")
                    .withExpressionAttributeNames(Map.of("#env", "environment"))
                    .withExpressionAttributeValues(Map.of(":environment", new AttributeValue().withS(environment)));
            
            ScanResult result = dynamoDBClient.scan(scanRequest);
            Map<String, ConfigurationItem> configs = new HashMap<>();
            
            for (Map<String, AttributeValue> item : result.getItems()) {
                ConfigurationItem config = mapToConfigurationItem(item);
                configs.put(config.getConfigKey(), config);
            }
            
            log.info("Loaded {} configuration items from DynamoDB", configs.size());
            return configs;
            
        } catch (Exception e) {
            log.error("Error scanning configuration table", e);
            throw new RuntimeException("Failed to scan configuration table", e);
        }
    }
    
    /**
     * Gets a specific configuration item
     */
    public ConfigurationItem getConfiguration(String configKey) {
        try {
            GetItemRequest request = new GetItemRequest()
                    .withTableName(configTableName)
                    .withKey(Map.of(
                            "configKey", new AttributeValue().withS(configKey),
                            "environment", new AttributeValue().withS(environment)
                    ));
            
            GetItemResult result = dynamoDBClient.getItem(request);
            
            if (result.getItem() == null || result.getItem().isEmpty()) {
                log.warn("Configuration not found: {} for environment: {}", configKey, environment);
                return null;
            }
            
            return mapToConfigurationItem(result.getItem());
            
        } catch (Exception e) {
            log.error("Error getting configuration item: {}", configKey, e);
            throw new RuntimeException("Failed to get configuration: " + configKey, e);
        }
    }
    
    /**
     * Maps DynamoDB item to ConfigurationItem
     */
    private ConfigurationItem mapToConfigurationItem(Map<String, AttributeValue> item) {
        String configKey = item.get("configKey").getS();
        String configValue = item.get("configValue").getS();
        String environment = item.get("environment").getS();
        Boolean encrypted = item.containsKey("encrypted") ? 
                Boolean.valueOf(item.get("encrypted").getBOOL()) : false;
        String description = item.containsKey("description") ? 
                item.get("description").getS() : null;
        Long lastUpdated = item.containsKey("lastUpdated") ? 
                Long.valueOf(item.get("lastUpdated").getN()) : null;
        
        // Decrypt value if encrypted
        if (encrypted) {
            configValue = decrypt(configValue);
        }
        
        return ConfigurationItem.builder()
                .configKey(configKey)
                .configValue(configValue)
                .environment(environment)
                .encrypted(encrypted)
                .description(description)
                .lastUpdated(lastUpdated)
                .build();
    }
    
    /**
     * Builds JWT configuration from loaded configs
     */
    private AppConfiguration.JwtConfiguration buildJwtConfiguration(Map<String, ConfigurationItem> configs) {
        return AppConfiguration.JwtConfiguration.builder()
                .secret(getConfigValue(configs, "jwt.secret"))
                .expiration(getConfigValueAsLong(configs, "jwt.expiration", 86400000L))
                .refreshExpiration(getConfigValueAsLong(configs, "jwt.refresh.expiration", 604800000L))
                .build();
    }
    
    /**
     * Builds AWS configuration from loaded configs
     */
    private AppConfiguration.AwsConfiguration buildAwsConfiguration(Map<String, ConfigurationItem> configs) {
        return AppConfiguration.AwsConfiguration.builder()
                .accessKey(getConfigValue(configs, "aws.access.key"))
                .secretKey(getConfigValue(configs, "aws.secret.key"))
                .region(getConfigValue(configs, "aws.region", "ap-south-1"))
                .bucketName(getConfigValue(configs, "aws.s3.bucket.name", "sweet-potato-receipts"))
                .build();
    }
    
    /**
     * Builds Mistral configuration from loaded configs
     */
    private AppConfiguration.MistralConfiguration buildMistralConfiguration(Map<String, ConfigurationItem> configs) {
        return AppConfiguration.MistralConfiguration.builder()
                .apiUrl(getConfigValue(configs, "mistral.api.url", "https://api.mistral.ai/v1"))
                .apiKey(getConfigValue(configs, "mistral.api.key"))
                .build();
    }
    
    /**
     * Gets config value with default fallback
     */
    private String getConfigValue(Map<String, ConfigurationItem> configs, String key, String defaultValue) {
        ConfigurationItem config = configs.get(key);
        return config != null ? config.getConfigValue() : defaultValue;
    }
    
    /**
     * Gets config value without default
     */
    private String getConfigValue(Map<String, ConfigurationItem> configs, String key) {
        ConfigurationItem config = configs.get(key);
        if (config == null) {
            log.warn("Configuration not found: {}", key);
            return null;
        }
        return config.getConfigValue();
    }
    
    /**
     * Gets config value as Long with default fallback
     */
    private Long getConfigValueAsLong(Map<String, ConfigurationItem> configs, String key, Long defaultValue) {
        String value = getConfigValue(configs, key, String.valueOf(defaultValue));
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException e) {
            log.warn("Invalid long value for config {}: {}, using default: {}", key, value, defaultValue);
            return defaultValue;
        }
    }
    
    /**
     * Decrypts an encrypted configuration value
     */
    private String decrypt(String encryptedValue) {
        try {
            SecretKeySpec keySpec = new SecretKeySpec(encryptionKey.getBytes(), "AES");
            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.DECRYPT_MODE, keySpec);
            
            byte[] decodedBytes = Base64.getDecoder().decode(encryptedValue);
            byte[] decryptedBytes = cipher.doFinal(decodedBytes);
            
            return new String(decryptedBytes);
        } catch (Exception e) {
            log.error("Error decrypting configuration value", e);
            throw new RuntimeException("Failed to decrypt configuration value", e);
        }
    }
}
