#!/bin/bash

# Step 1: Disable Block Public Access settings (required for bucket policies)
echo "🔓 Disabling Block Public Access settings..."
aws s3api put-public-access-block \
    --bucket fuel-company-logos \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Wait for settings to take effect
sleep 2

# Step 2: Upload logo files (without ACL since bucket has ACLs disabled)
echo "📤 Uploading logo files..."
aws s3 cp shell-logo.png s3://fuel-company-logos/shell.png
aws s3 cp bp-logo.png s3://fuel-company-logos/bp.png
aws s3 cp indian-oil-logo.png s3://fuel-company-logos/indian-oil.png
aws s3 cp hpcl-logo.png s3://fuel-company-logos/hpcl.png
aws s3 cp reliance-logo.png s3://fuel-company-logos/reliance.png
aws s3 cp essar-logo.png s3://fuel-company-logos/essar.png
aws s3 cp total-logo.png s3://fuel-company-logos/total.png
aws s3 cp adani-logo.png s3://fuel-company-logos/adani.png
aws s3 cp gulf-logo.png s3://fuel-company-logos/gulf.png
aws s3 cp castrol-logo.png s3://fuel-company-logos/castrol.png
aws s3 cp default-logo.png s3://fuel-company-logos/default.png

# Step 3: Apply bucket policy for public read access
echo "🔒 Setting bucket policy for public read access..."
aws s3api put-bucket-policy --bucket fuel-company-logos --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::fuel-company-logos/*"
    }
  ]
}'

# Step 4: Test that a logo is publicly accessible
echo "🧪 Testing public access..."
curl -I https://fuel-company-logos.s3.ap-south-1.amazonaws.com/shell.png

echo "✅ Upload complete! Your fuel brand logos should now be accessible."

# Step 5: Add DynamoDB configuration
echo "🗄️  Adding fuel logos bucket configuration to DynamoDB..."
aws dynamodb put-item \
    --table-name sweet-potato-config \
    --item '{
        "configKey": {"S": "aws.s3.fuel.logos.bucket.name"},
        "environment": {"S": "dev"},
        "configValue": {"S": "fuel-company-logos"},
        "encrypted": {"BOOL": false},
        "description": {"S": "S3 bucket name for fuel brand logos"},
        "lastUpdated": {"N": "'$(date +%s)'"}
    }' 2>/dev/null && echo "✅ DynamoDB config added" || echo "⚠️  DynamoDB config may already exist"

echo "📋 Test URLs:"
echo "   Shell: https://fuel-company-logos.s3.ap-south-1.amazonaws.com/shell.png"
echo "   Default: https://fuel-company-logos.s3.ap-south-1.amazonaws.com/default.png"
echo ""
echo "🎉 Setup complete! Restart your application to use the new fuel brand logos."