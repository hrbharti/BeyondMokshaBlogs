/**
 * Verify S3 CORS Configuration
 * This script checks if CORS is properly configured for your bucket
 */

const { S3Client, GetBucketCorsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET;

async function verifyCORS() {
  try {
    console.log(`🔍 Checking CORS configuration for bucket: ${BUCKET_NAME}`);

    const command = new GetBucketCorsCommand({
      Bucket: BUCKET_NAME
    });

    const response = await s3Client.send(command);

    console.log('✅ CORS Configuration Found:');
    console.log(JSON.stringify(response.CORSRules, null, 2));

    // Check if our required origins are included
    const rules = response.CORSRules || [];
    const requiredOrigins = [
      'https://www.beyondmoksha.com',
      'https://beyondmoksha.com'
    ];

    let allOriginsAllowed = true;
    for (const rule of rules) {
      for (const requiredOrigin of requiredOrigins) {
        const isAllowed = rule.AllowedOrigins.some(allowedOrigin => 
          allowedOrigin === requiredOrigin || allowedOrigin === '*'
        );
        if (!isAllowed) {
          allOriginsAllowed = false;
          console.warn(`⚠️  Origin ${requiredOrigin} is not explicitly allowed`);
        }
      }
    }

    if (allOriginsAllowed) {
      console.log('✅ All required origins are properly configured!');
    }

  } catch (error) {
    if (error.name === 'NoSuchCORSConfiguration') {
      console.error('❌ No CORS configuration found on bucket');
      console.error('💡 Run the configure_s3_cors.js script first');
    } else {
      console.error('❌ Error checking CORS:', error.message);
    }
    process.exit(1);
  }
}

verifyCORS();