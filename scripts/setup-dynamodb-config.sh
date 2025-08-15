#!/bin/bash

# Sweet Potato DynamoDB Configuration Setup Script
# This script creates the DynamoDB table and populates it with initial configuration

set -e

# Configuration
TABLE_NAME=${CONFIG_TABLE_NAME:-sweet-potato-config}
AWS_REGION=${AWS_REGION:-ap-south-1}
ENVIRONMENT=${APP_ENVIRONMENT:-dev}

echo "==================================================================================="
echo "           Sweet Potato DynamoDB Configuration Setup"
echo "==================================================================================="
echo "Table Name: $TABLE_NAME"
echo "Region: $AWS_REGION"
echo "Environment: $ENVIRONMENT"
echo ""

# Check if AWS CLI is installed
echo "🔍 Checking prerequisites..."
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed."
    echo ""
    echo "Please install AWS CLI first:"
    echo "  macOS: brew install awscli"
    echo "  Ubuntu/Debian: sudo apt-get install awscli"
    echo "  Windows: Download from https://aws.amazon.com/cli/"
    exit 1
fi
echo "✅ AWS CLI is installed"

# Check AWS authentication
echo "🔐 Checking AWS authentication..."
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "❌ Error: AWS authentication failed."
    echo ""
    echo "Please configure AWS credentials using one of these methods:"
    echo ""
    echo "1. Run: aws configure"
    echo "   Then enter your AWS Access Key ID and Secret Access Key"
    echo ""
    echo "2. Set environment variables:"
    echo "   export AWS_ACCESS_KEY_ID='your-access-key'"
    echo "   export AWS_SECRET_ACCESS_KEY='your-secret-key'"
    echo ""
    echo "3. Use AWS credentials file (~/.aws/credentials)"
    echo ""
    echo "To get AWS credentials:"
    echo "  1. Go to AWS Console → IAM → Users"
    echo "  2. Create/select user with DynamoDB permissions"
    echo "  3. Go to Security credentials → Create access key"
    exit 1
fi

# Show current AWS identity
AWS_IDENTITY=$(aws sts get-caller-identity 2>/dev/null)
ACCOUNT_ID=$(echo $AWS_IDENTITY | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
USER_ARN=$(echo $AWS_IDENTITY | grep -o '"Arn": "[^"]*' | cut -d'"' -f4)
echo "✅ Authenticated as: $USER_ARN"
echo "✅ AWS Account: $ACCOUNT_ID"

# Test DynamoDB permissions
echo "🧪 Testing DynamoDB permissions..."
if ! aws dynamodb list-tables --region $AWS_REGION >/dev/null 2>&1; then
    echo "❌ Error: No permissions to access DynamoDB."
    echo ""
    echo "Your AWS user needs these DynamoDB permissions:"
    echo "  - dynamodb:CreateTable"
    echo "  - dynamodb:DescribeTable" 
    echo "  - dynamodb:PutItem"
    echo "  - dynamodb:GetItem"
    echo "  - dynamodb:Scan"
    echo "  - dynamodb:Query"
    echo ""
    echo "Please contact your AWS administrator to add these permissions."
    exit 1
fi
echo "✅ DynamoDB permissions verified"
echo ""

# Check if table exists
echo "📋 Checking if table exists..."
if aws dynamodb describe-table --table-name $TABLE_NAME --region $AWS_REGION >/dev/null 2>&1; then
    echo "ℹ️  Table $TABLE_NAME already exists."
    read -p "Do you want to add/update configuration data? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
else
    echo "🔨 Creating table $TABLE_NAME..."
    aws dynamodb create-table \
        --table-name $TABLE_NAME \
        --attribute-definitions \
            AttributeName=configKey,AttributeType=S \
            AttributeName=environment,AttributeType=S \
        --key-schema \
            AttributeName=configKey,KeyType=HASH \
            AttributeName=environment,KeyType=RANGE \
        --provisioned-throughput \
            ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --region $AWS_REGION

    echo "⏳ Waiting for table to be created..."
    aws dynamodb wait table-exists --table-name $TABLE_NAME --region $AWS_REGION
    echo "✅ Table created successfully!"
fi

echo ""
echo "📝 Populating configuration data..."

# Function to add configuration item
add_config() {
    local key=$1
    local value=$2
    local encrypted=$3
    local description=$4
    local timestamp=$(date +%s)
    
    echo "  Adding: $key"
    
    aws dynamodb put-item \
        --table-name $TABLE_NAME \
        --region $AWS_REGION \
        --item "{
            \"configKey\": {\"S\": \"$key\"},
            \"environment\": {\"S\": \"$ENVIRONMENT\"},
            \"configValue\": {\"S\": \"$value\"},
            \"encrypted\": {\"BOOL\": $encrypted},
            \"description\": {\"S\": \"$description\"},
            \"lastUpdated\": {\"N\": \"$timestamp\"}
        }" >/dev/null
}

# Prompt for sensitive values
echo "Please provide the following sensitive configuration values:"
echo "(These will be stored encrypted in DynamoDB)"
echo ""

read -p "Enter JWT Secret (base64 encoded, at least 64 characters): " JWT_SECRET
read -p "Enter AWS Access Key: " AWS_ACCESS_KEY
read -s -p "Enter AWS Secret Key: " AWS_SECRET_KEY
echo ""
read -p "Enter Mistral API Key: " MISTRAL_API_KEY

echo ""
echo "Please provide the following non-sensitive configuration values:"
echo ""

read -p "Enter AWS Region (default: ap-south-1): " AWS_REGION_CONFIG
AWS_REGION_CONFIG=${AWS_REGION_CONFIG:-ap-south-1}

read -p "Enter S3 Bucket Name (default: sweet-potato-receipts): " S3_BUCKET
S3_BUCKET=${S3_BUCKET:-sweet-potato-receipts}

read -p "Enter Mistral API URL (default: https://api.mistral.ai/v1): " MISTRAL_URL
MISTRAL_URL=${MISTRAL_URL:-https://api.mistral.ai/v1}

read -p "Enter JWT Expiration in milliseconds (default: 86400000 = 24 hours): " JWT_EXP
JWT_EXP=${JWT_EXP:-86400000}

read -p "Enter JWT Refresh Expiration in milliseconds (default: 604800000 = 7 days): " JWT_REFRESH_EXP
JWT_REFRESH_EXP=${JWT_REFRESH_EXP:-604800000}

echo ""
echo "Adding configuration items..."

# NOTE: For production, you should encrypt sensitive values before storing
# This script stores them as plain text for simplicity
# See the documentation for proper encryption methods

# Add sensitive configuration (these should be encrypted in production)
add_config "jwt.secret" "$JWT_SECRET" "true" "JWT signing secret"
add_config "aws.access.key" "$AWS_ACCESS_KEY" "true" "AWS access key for S3 operations"
add_config "aws.secret.key" "$AWS_SECRET_KEY" "true" "AWS secret key for S3 operations"
add_config "mistral.api.key" "$MISTRAL_API_KEY" "true" "Mistral AI API key for OCR"

# Add non-sensitive configuration
add_config "aws.region" "$AWS_REGION_CONFIG" "false" "AWS region"
add_config "aws.s3.bucket.name" "$S3_BUCKET" "false" "S3 bucket name for file uploads"
add_config "mistral.api.url" "$MISTRAL_URL" "false" "Mistral AI API base URL"
add_config "jwt.expiration" "$JWT_EXP" "false" "JWT token expiration in milliseconds"
add_config "jwt.refresh.expiration" "$JWT_REFRESH_EXP" "false" "JWT refresh token expiration in milliseconds"

echo ""
echo "Configuration setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Set the following environment variables when running your application:"
echo "   - CONFIG_TABLE_NAME=$TABLE_NAME"
echo "   - APP_ENVIRONMENT=$ENVIRONMENT"
echo "   - AWS_REGION=$AWS_REGION"
echo "   - CONFIG_ENCRYPTION_KEY=<your-32-character-encryption-key>"
echo ""
echo "2. Ensure your application has proper AWS credentials to access DynamoDB"
echo ""
echo "3. For production deployments:"
echo "   - Use proper encryption for sensitive values (see documentation)"
echo "   - Store the encryption key securely (e.g., AWS Systems Manager)"
echo "   - Use IAM roles instead of access keys"
echo ""
echo "Warning: The sensitive values in this setup are stored as plain text."
echo "For production use, please encrypt them using the application's encryption key."
