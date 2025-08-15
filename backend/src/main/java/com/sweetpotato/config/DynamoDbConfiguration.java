package com.sweetpotato.config;

import com.amazonaws.auth.DefaultAWSCredentialsProviderChain;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for DynamoDB client
 */
@Configuration
@Slf4j
public class DynamoDbConfiguration {
    
    @Value("${aws.region:ap-south-1}")
    private String awsRegion;
    
    @Bean
    public AmazonDynamoDB dynamoDBClient() {
        try {
            log.info("Initializing DynamoDB client for region: {}", awsRegion);
            return AmazonDynamoDBClientBuilder.standard()
                    .withRegion(Regions.fromName(awsRegion))
                    .withCredentials(DefaultAWSCredentialsProviderChain.getInstance())
                    .build();
        } catch (Exception e) {
            log.error("Failed to initialize DynamoDB client", e);
            throw new RuntimeException("Could not initialize DynamoDB client", e);
        }
    }
}
