#!/bin/bash

# Add SES Configuration to DynamoDB
# This script adds SES configuration items to DynamoDB

set -e

# Configuration
TABLE_NAME="sweet-potato-config"
ENVIRONMENT=${APP_ENVIRONMENT:-"dev"}
AWS_REGION=${AWS_REGION:-"ap-south-1"}

echo "🔧 Adding SES Configuration to DynamoDB"
echo "========================================"
echo "Table: $TABLE_NAME"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo

# Function to add or update configuration item
add_or_update_config() {
    local config_key=$1
    local config_value=$2
    local description=$3
    
    echo "Adding/updating config: $config_key = $config_value"
    
    # Create properly escaped JSON
    local json_item=$(cat <<EOF
{
    "configKey": {"S": "$config_key"},
    "environment": {"S": "$ENVIRONMENT"},
    "configValue": {"S": "$config_value"},
    "description": {"S": "$description"},
    "lastUpdated": {"S": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"}
}
EOF
)
    
    aws dynamodb put-item \
        --region $AWS_REGION \
        --table-name $TABLE_NAME \
        --item "$json_item" || echo "❌ Failed to add $config_key"
}

# Prompt for verified email address
echo "📧 Please enter your VERIFIED email address from AWS SES:"
echo "   (This should be the email you just verified in AWS SES Console)"
read -p "   Verified Email: " VERIFIED_EMAIL

if [ -z "$VERIFIED_EMAIL" ]; then
    echo "❌ Email address is required!"
    exit 1
fi

echo
echo "📝 Adding SES configuration items..."

# Add SES configuration items
add_or_update_config "aws.ses.from.email" "$VERIFIED_EMAIL" "SES from email address for sending emails"
add_or_update_config "aws.ses.reply.to.email" "$VERIFIED_EMAIL" "SES reply-to email address"
add_or_update_config "aws.app.name" "Sweet Potato" "Application name used in email templates"

echo
echo "✅ SES configuration added successfully!"
echo

# Verify the configuration
echo "📋 Current SES configuration:"
aws dynamodb scan \
    --region $AWS_REGION \
    --table-name $TABLE_NAME \
    --filter-expression "begins_with(configKey, :prefix)" \
    --expression-attribute-values '{":prefix":{"S":"aws.ses"}}' \
    --projection-expression "configKey, configValue" \
    --output table

echo
echo "🚀 Next step: Test the forgot password functionality!"
echo
