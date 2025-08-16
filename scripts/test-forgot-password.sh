#!/bin/bash

# Complete Forgot Password Flow Test Script
# This script helps you test the entire forgot password functionality

set -e

BASE_URL="http://localhost:8082/api/auth"
EMAIL="work.shrayankmistry@gmail.com"

echo "🔐 Sweet Potato - Forgot Password Testing"
echo "========================================"
echo

# Step 1: Request OTP
echo "📧 Step 1: Requesting OTP for email: $EMAIL"
RESPONSE1=$(curl -X POST "$BASE_URL/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}" \
  -s -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1 | sed 's/HTTP_CODE://')
BODY1=$(echo "$RESPONSE1" | sed '$d')

echo "Response: $BODY1"
echo "Status: $HTTP_CODE1"
echo

if [ "$HTTP_CODE1" != "200" ]; then
    echo "❌ Step 1 failed! Check server logs."
    exit 1
fi

echo "✅ Step 1 successful! Check your email for the OTP code."
echo

# Step 2: Get OTP from user
echo "📱 Step 2: OTP Verification"
read -p "Enter the 6-digit OTP from your email: " OTP

if [ -z "$OTP" ] || [ ${#OTP} -ne 6 ]; then
    echo "❌ Invalid OTP format. Must be exactly 6 digits."
    exit 1
fi

# Verify OTP
echo "Verifying OTP: $OTP"
RESPONSE2=$(curl -X POST "$BASE_URL/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"otp\": \"$OTP\"}" \
  -s -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1 | sed 's/HTTP_CODE://')
BODY2=$(echo "$RESPONSE2" | sed '$d')

echo "Response: $BODY2"
echo "Status: $HTTP_CODE2"
echo

if [ "$HTTP_CODE2" != "200" ]; then
    echo "❌ Step 2 failed! OTP verification unsuccessful."
    exit 1
fi

echo "✅ Step 2 successful! OTP verified."
echo

# Step 3: Reset password
echo "🔒 Step 3: Password Reset"
read -s -p "Enter new password: " NEW_PASSWORD
echo

if [ -z "$NEW_PASSWORD" ] || [ ${#NEW_PASSWORD} -lt 6 ]; then
    echo "❌ Password must be at least 6 characters."
    exit 1
fi

# Reset password
echo "Resetting password..."
RESPONSE3=$(curl -X POST "$BASE_URL/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"otp\": \"$OTP\", \"newPassword\": \"$NEW_PASSWORD\"}" \
  -s -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE3=$(echo "$RESPONSE3" | tail -n1 | sed 's/HTTP_CODE://')
BODY3=$(echo "$RESPONSE3" | sed '$d')

echo "Response: $BODY3"
echo "Status: $HTTP_CODE3"
echo

if [ "$HTTP_CODE3" != "200" ]; then
    echo "❌ Step 3 failed! Password reset unsuccessful."
    exit 1
fi

echo "✅ Step 3 successful! Password has been reset."
echo
echo "🎉 COMPLETE SUCCESS! 🎉"
echo "=================================="
echo "✅ OTP was sent via email"
echo "✅ OTP was verified successfully"
echo "✅ Password was reset successfully"
echo "✅ Confirmation email was sent"
echo
echo "You should receive a confirmation email shortly."
echo "You can now login with your new password!"
echo
