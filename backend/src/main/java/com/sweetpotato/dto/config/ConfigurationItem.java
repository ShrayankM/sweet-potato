package com.sweetpotato.dto.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a configuration item stored in DynamoDB
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigurationItem {
    
    /**
     * The configuration key (partition key in DynamoDB)
     * Examples: "jwt.secret", "aws.access.key", "mistral.api.key"
     */
    private String configKey;
    
    /**
     * The configuration value (encrypted if sensitive)
     */
    private String configValue;
    
    /**
     * Environment for this configuration (sort key in DynamoDB)
     * Examples: "dev", "prod", "staging"
     */
    private String environment;
    
    /**
     * Whether this configuration value is encrypted
     */
    private Boolean encrypted;
    
    /**
     * Description of what this configuration is for
     */
    private String description;
    
    /**
     * When this configuration was last updated
     */
    private Long lastUpdated;
}
