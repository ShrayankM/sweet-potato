#!/bin/bash

# Test AWS SES Configuration Script
# This script helps test your SES setup

set -e

echo "🧪 Testing AWS SES Setup"
echo "========================"
echo

# Check AWS CLI configuration
echo "1. Checking AWS CLI configuration..."
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "❌ AWS CLI not configured properly"
    echo "   Run: aws configure"
    echo "   Enter your AWS Access Key, Secret Key, and Region"
    exit 1
else
    echo "✅ AWS CLI configured"
    aws sts get-caller-identity --output table
fi

echo

# Check SES identities
echo "2. Checking SES verified identities..."
REGION=${AWS_REGION:-"ap-south-1"}

echo "   Region: $REGION"
aws ses list-identities --region $REGION --output table

echo

# Check account sending status
echo "3. Checking SES account status..."
echo "   Checking if account is in sandbox mode..."
aws ses get-account-sending-enabled --region $REGION --output table

echo "   Checking send quota..."
aws ses get-send-quota --region $REGION --output table

echo

echo "📧 Next steps:"
echo "   1. If you see your email/domain above as 'Verified', you're ready!"
echo "   2. Update the DynamoDB config with your verified email"
echo "   3. Test the forgot password functionality"
echo
echo "🚀 To update DynamoDB config, run:"
echo "   ./scripts/setup-ses-config.sh"
echo
