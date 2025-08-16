#!/bin/bash

# AWS SES Configuration Setup Script
# This script adds the necessary SES configuration to DynamoDB

set -e

# Configuration
TABLE_NAME="sweet-potato-config"
ENVIRONMENT=${APP_ENVIRONMENT:-"dev"}
AWS_REGION=${AWS_REGION:-"ap-south-1"}

echo "Setting up AWS SES configuration in DynamoDB..."
echo "Table: $TABLE_NAME"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"

# Function to add configuration item
add_config_item() {
    local config_key=$1
    local config_value=$2
    local description=$3
    
    echo "Adding config: $config_key"
    
    aws dynamodb put-item \
        --region $AWS_REGION \
        --table-name $TABLE_NAME \
        --item '{
            "configKey": {"S": "'$config_key'"},
            "environment": {"S": "'$ENVIRONMENT'"},
            "configValue": {"S": "'$config_value'"},
            "description": {"S": "'$description'"},
            "lastUpdated": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}
        }' \
        --condition-expression "attribute_not_exists(configKey)" \
        2>/dev/null || echo "Config $config_key already exists, skipping..."
}

# Add SES configuration items
echo "Adding SES configuration items..."

# SES From Email (REQUIRED - Replace with your verified email/domain)
add_config_item "aws.ses.from.email" "noreply@yourdomain.com" "SES from email address for sending emails"

# SES Reply-To Email (Optional - defaults to from email if not set)
add_config_item "aws.ses.reply.to.email" "support@yourdomain.com" "SES reply-to email address"

# Application Name (Used in email templates)
add_config_item "aws.app.name" "Sweet Potato" "Application name used in email templates"

echo ""
echo "✅ SES configuration setup complete!"
echo ""
echo "⚠️  IMPORTANT: Update the email addresses above with your actual domain!"
echo "   - aws.ses.from.email: Must be verified in AWS SES"
echo "   - aws.ses.reply.to.email: Should be a monitored support email"
echo ""
echo "📧 Next steps:"
echo "1. Verify your email/domain in AWS SES console"
echo "2. Update the configuration values in DynamoDB with your actual domain"
echo "3. Test the forgot password functionality"
echo ""

# Show current configuration
echo "Current SES configuration in DynamoDB:"
aws dynamodb scan \
    --region $AWS_REGION \
    --table-name $TABLE_NAME \
    --filter-expression "begins_with(configKey, :prefix)" \
    --expression-attribute-values '{":prefix":{"S":"aws.ses"}}' \
    --select "ALL_ATTRIBUTES" \
    --output table
