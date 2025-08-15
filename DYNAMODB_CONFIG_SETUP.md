# DynamoDB Configuration Setup

This document explains how to set up and manage configuration data in DynamoDB for the Sweet Potato application.

## Overview

The application now loads sensitive configuration values from DynamoDB instead of having them hardcoded in the `application.yml` file. This provides better security by:

1. Removing sensitive data from the codebase
2. Supporting encrypted storage of secrets
3. Allowing runtime configuration changes
4. Centralizing configuration management

## DynamoDB Table Structure

### Table Name
`sweet-potato-config` (configurable via `CONFIG_TABLE_NAME` environment variable)

### Table Schema
- **Partition Key**: `configKey` (String) - The configuration key
- **Sort Key**: `environment` (String) - The environment (dev, staging, prod)

### Attributes
- `configKey` (String): Configuration key (e.g., "jwt.secret")
- `environment` (String): Environment name (e.g., "dev", "prod")
- `configValue` (String): The configuration value (encrypted if sensitive)
- `encrypted` (Boolean): Whether the value is encrypted
- `description` (String): Description of the configuration
- `lastUpdated` (Number): Timestamp of last update

## Setting up the DynamoDB Table

### 1. Create the Table

Using AWS CLI:
```bash
aws dynamodb create-table \
    --table-name sweet-potato-config \
    --attribute-definitions \
        AttributeName=configKey,AttributeType=S \
        AttributeName=environment,AttributeType=S \
    --key-schema \
        AttributeName=configKey,KeyType=HASH \
        AttributeName=environment,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region ap-south-1
```

### 2. Populate Configuration Data

#### Development Environment (dev)

```bash
# JWT Secret
aws dynamodb put-item \
    --table-name sweet-potato-config \
    --item '{
        "configKey": {"S": "jwt.secret"},
        "environment": {"S": "dev"},
        "configValue": {"S": "YOUR_BASE64_ENCODED_JWT_SECRET"},
        "encrypted": {"BOOL": true},
        "description": {"S": "JWT signing secret for dev environment"},
        "lastUpdated": {"N": "'$(date +%s)'"}
    }'

# AWS Access Key
aws dynamodb put-item \
    --table-name sweet-potato-config \
    --item '{
        "configKey": {"S": "aws.access.key"},
        "environment": {"S": "dev"},
        "configValue": {"S": "YOUR_ENCRYPTED_AWS_ACCESS_KEY"},
        "encrypted": {"BOOL": true},
        "description": {"S": "AWS access key for S3 operations"},
        "lastUpdated": {"N": "'$(date +%s)'"}
    }'

# AWS Secret Key
aws dynamodb put-item \
    --table-name sweet-potato-config \
    --item '{
        "configKey": {"S": "aws.secret.key"},
        "environment": {"S": "dev"},
        "configValue": {"S": "YOUR_ENCRYPTED_AWS_SECRET_KEY"},
        "encrypted": {"BOOL": true},
        "description": {"S": "AWS secret key for S3 operations"},
        "lastUpdated": {"N": "'$(date +%s)'"}
    }'

# AWS Region (not encrypted)
aws dynamodb put-item \
    --table-name sweet-potato-config \
    --item '{
        "configKey": {"S": "aws.region"},
        "environment": {"S": "dev"},
        "configValue": {"S": "ap-south-1"},
        "encrypted": {"BOOL": false},
        "description": {"S": "AWS region"},
        "lastUpdated": {"N": "'$(date +%s)'"}
    }'

# AWS S3 Bucket Name (not encrypted)
aws dynamodb put-item \
    --table-name sweet-potato-config \
    --item '{
        "configKey": {"S": "aws.s3.bucket.name"},
        "environment": {"S": "dev"},
        "configValue": {"S": "sweet-potato-receipts"},
        "encrypted": {"BOOL": false},
        "description": {"S": "S3 bucket name for file uploads"},
        "lastUpdated": {"N": "'$(date +%s)'"}
    }'

# Mistral API Key
aws dynamodb put-item \
    --table-name sweet-potato-config \
    --item '{
        "configKey": {"S": "mistral.api.key"},
        "environment": {"S": "dev"},
        "configValue": {"S": "YOUR_ENCRYPTED_MISTRAL_API_KEY"},
        "encrypted": {"BOOL": true},
        "description": {"S": "Mistral AI API key for OCR"},
        "lastUpdated": {"N": "'$(date +%s)'"}
    }'

# Mistral API URL (not encrypted)
aws dynamodb put-item \
    --table-name sweet-potato-config \
    --item '{
        "configKey": {"S": "mistral.api.url"},
        "environment": {"S": "dev"},
        "configValue": {"S": "https://api.mistral.ai/v1"},
        "encrypted": {"BOOL": false},
        "description": {"S": "Mistral AI API base URL"},
        "lastUpdated": {"N": "'$(date +%s)'"}
    }'

# JWT Expiration (not encrypted)
aws dynamodb put-item \
    --table-name sweet-potato-config \
    --item '{
        "configKey": {"S": "jwt.expiration"},
        "environment": {"S": "dev"},
        "configValue": {"S": "86400000"},
        "encrypted": {"BOOL": false},
        "description": {"S": "JWT token expiration in milliseconds"},
        "lastUpdated": {"N": "'$(date +%s)'"}
    }'

# JWT Refresh Expiration (not encrypted)
aws dynamodb put-item \
    --table-name sweet-potato-config \
    --item '{
        "configKey": {"S": "jwt.refresh.expiration"},
        "environment": {"S": "dev"},
        "configValue": {"S": "604800000"},
        "encrypted": {"BOOL": false},
        "description": {"S": "JWT refresh token expiration in milliseconds"},
        "lastUpdated": {"N": "'$(date +%s)'"}
    }'
```

## Encryption

### Encryption Key
The application uses AES encryption for sensitive values. The encryption key is configured via the `CONFIG_ENCRYPTION_KEY` environment variable.

**Important**: In production, this key should be:
1. Stored securely (e.g., AWS Systems Manager Parameter Store)
2. At least 32 characters long
3. Randomly generated
4. Different per environment

### Encrypting Values

To encrypt a value before storing it in DynamoDB, use the same AES key that the application uses. Here's a Java example:

```java
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public String encrypt(String plaintext, String key) throws Exception {
    SecretKeySpec keySpec = new SecretKeySpec(key.getBytes(), "AES");
    Cipher cipher = Cipher.getInstance("AES");
    cipher.init(Cipher.ENCRYPT_MODE, keySpec);
    byte[] encryptedBytes = cipher.doFinal(plaintext.getBytes());
    return Base64.getEncoder().encodeToString(encryptedBytes);
}
```

## Environment Variables

The application requires these environment variables:

### Required for DynamoDB access:
- `AWS_REGION`: AWS region where DynamoDB table is located
- `CONFIG_TABLE_NAME`: DynamoDB table name (default: sweet-potato-config)
- `APP_ENVIRONMENT`: Environment name (dev, staging, prod)
- `CONFIG_ENCRYPTION_KEY`: AES encryption key for sensitive values

### Required for DynamoDB authentication:
Configure AWS credentials using one of these methods:
1. **EC2 Instance Profile** (recommended for production)
2. **Environment variables**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
3. **AWS Credentials file**: `~/.aws/credentials`
4. **ECS Task Role** (for containerized deployments)

## Production Setup

### 1. Create separate environments in DynamoDB
Repeat the setup process for each environment (dev, staging, prod) using different values for sensitive data.

### 2. Use AWS Systems Manager for encryption keys
Store the `CONFIG_ENCRYPTION_KEY` in AWS Systems Manager Parameter Store:

```bash
aws ssm put-parameter \
    --name "/sweet-potato/config/encryption-key" \
    --value "your-secure-32-character-key-here" \
    --type "SecureString" \
    --description "Encryption key for configuration values"
```

### 3. Set up proper IAM permissions
Create an IAM policy that allows the application to read from DynamoDB:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:Scan",
                "dynamodb:Query"
            ],
            "Resource": "arn:aws:dynamodb:ap-south-1:YOUR-ACCOUNT-ID:table/sweet-potato-config"
        }
    ]
}
```

## Troubleshooting

### Application won't start
1. Check that the DynamoDB table exists and is accessible
2. Verify AWS credentials are properly configured
3. Ensure all required configuration keys are present in the table
4. Check the encryption key is correct

### Configuration not loading
1. Verify the environment name matches what's in the DynamoDB table
2. Check CloudWatch logs for specific error messages
3. Ensure the DynamoDB table has the correct schema

### Decryption errors
1. Verify the encryption key is the same as used for encryption
2. Check that encrypted values were properly base64 encoded
3. Ensure the encryption key is exactly 32 characters

## Configuration Management

### Adding new configuration
1. Add the item to DynamoDB with appropriate encryption setting
2. Update the `DynamicConfigurationProperties` class if needed
3. Restart the application to load new configuration

### Updating existing configuration
1. Update the item in DynamoDB
2. Use the configuration reload endpoint (if implemented) or restart the application

### Configuration reload endpoint
You can add an endpoint to reload configuration without restarting:

```java
@RestController
@RequestMapping("/admin")
public class ConfigController {
    
    @Autowired
    private ConfigurationLoaderService configLoader;
    
    @PostMapping("/reload-config")
    public ResponseEntity<String> reloadConfig() {
        configLoader.reloadConfiguration();
        return ResponseEntity.ok("Configuration reloaded successfully");
    }
}
```
