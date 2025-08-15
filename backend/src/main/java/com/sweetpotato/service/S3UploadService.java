package com.sweetpotato.service;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.sweetpotato.config.DynamicConfigurationProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class S3UploadService {

    private final DynamicConfigurationProperties configProperties;
    private AmazonS3 s3Client;

    @PostConstruct
    public void initializeS3Client() {
        BasicAWSCredentials awsCredentials = new BasicAWSCredentials(
                configProperties.getAwsAccessKey(), 
                configProperties.getAwsSecretKey()
        );
        
        this.s3Client = AmazonS3ClientBuilder.standard()
                .withRegion(Regions.fromName(configProperties.getAwsRegion()))
                .withCredentials(new AWSStaticCredentialsProvider(awsCredentials))
                .build();
    }

    @Bean
    public AmazonS3 amazonS3Client() {
        BasicAWSCredentials awsCredentials = new BasicAWSCredentials(
                configProperties.getAwsAccessKey(), 
                configProperties.getAwsSecretKey()
        );
        
        return AmazonS3ClientBuilder.standard()
                .withRegion(Regions.fromName(configProperties.getAwsRegion()))
                .withCredentials(new AWSStaticCredentialsProvider(awsCredentials))
                .build();
    }

    public String uploadFile(MultipartFile file, String folder) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        String fileName = folder + "/" + UUID.randomUUID().toString() + "_" + file.getOriginalFilename();

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType(file.getContentType());
        metadata.setContentLength(file.getSize());

        try {
            String bucketName = configProperties.getAwsBucketName();
            PutObjectRequest putObjectRequest = new PutObjectRequest(bucketName, fileName, file.getInputStream(), metadata);
            s3Client.putObject(putObjectRequest);
            
            String fileUrl = s3Client.getUrl(bucketName, fileName).toString();
            log.info("File uploaded successfully to S3: {}", fileUrl);
            
            return fileUrl;
        } catch (Exception e) {
            log.error("Error uploading file to S3", e);
            throw new RuntimeException("Failed to upload file to S3", e);
        }
    }

    public String uploadReceiptImage(MultipartFile file) throws IOException {
        return uploadFile(file, "receipts");
    }

    public void deleteFile(String fileUrl) {
        try {
            String fileName = extractFileNameFromUrl(fileUrl);
            s3Client.deleteObject(configProperties.getAwsBucketName(), fileName);
            log.info("File deleted successfully from S3: {}", fileName);
        } catch (Exception e) {
            log.error("Error deleting file from S3", e);
            throw new RuntimeException("Failed to delete file from S3", e);
        }
    }

    private String extractFileNameFromUrl(String fileUrl) {
        // Extract the file name from the S3 URL
        // Format: https://bucket.s3.region.amazonaws.com/filename
        return fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
    }
}
