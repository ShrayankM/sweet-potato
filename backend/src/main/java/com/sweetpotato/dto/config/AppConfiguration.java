package com.sweetpotato.dto.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Contains all application configuration loaded from DynamoDB
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppConfiguration {
    
    private JwtConfiguration jwt;
    private AwsConfiguration aws;
    private MistralConfiguration mistral;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JwtConfiguration {
        private String secret;
        private Long expiration;
        private Long refreshExpiration;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AwsConfiguration {
        private String accessKey;
        private String secretKey;
        private String region;
        private String bucketName;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MistralConfiguration {
        private String apiUrl;
        private String apiKey;
    }
}
