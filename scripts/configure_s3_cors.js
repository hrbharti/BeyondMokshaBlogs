/**
 * Configure S3 CORS for BeyondMoksha Blog
 * This script sets up CORS rules to allow your frontend to access S3 files
 */

const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
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

const corsConfiguration = {
  CORSRules: [
    {
      ID: 'AllowBeyondMokshaWebsite',
      AllowedOrigins: [
        'https://www.beyondmoksha.com',
        'https://beyondmoksha.com',
        'http://localhost:3000', // For local development
        'http://localhost:3001'  // Alternative dev port
      ],
      AllowedMethods: ['GET', 'HEAD'],
      AllowedHeaders: [
        'Authorization',
        'Content-Type',
        'X-Amz-Date',
        'X-Amz-Security-Token',
        'X-Amz-User-Agent',
        'x-amz-content-sha256',
        'x-amz-checksum-mode'
      ],
      MaxAgeSeconds: 3000,
      ExposeHeaders: [
        'ETag',
        'x-amz-meta-custom-header'
      ]
    }
  ]
};

async function configureCORS() {
  try {
    console.log(`🔧 Configuring CORS for bucket: ${BUCKET_NAME}`);

    const command = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    });

    await s3Client.send(command);

    console.log('✅ CORS configuration applied successfully!');
    console.log('📝 CORS Rules:');
    console.log(`   - Allowed Origins: ${corsConfiguration.CORSRules[0].AllowedOrigins.join(', ')}`);
    console.log(`   - Allowed Methods: ${corsConfiguration.CORSRules[0].AllowedMethods.join(', ')}`);
    console.log(`   - Cache Duration: ${corsConfiguration.CORSRules[0].MaxAgeSeconds} seconds`);
    console.log('\n🌐 Your website can now access S3 files directly!');
    
  } catch (error) {
    console.error('❌ Error configuring CORS:', error.message);
    
    if (error.name === 'AccessDenied') {
      console.error('💡 Make sure your AWS credentials have s3:PutBucketCors permission');
    } else if (error.name === 'NoSuchBucket') {
      console.error(`💡 Bucket "${BUCKET_NAME}" does not exist`);
    } else {
      console.error('💡 Check your AWS credentials and bucket name');
    }
    
    process.exit(1);
  }
}

// Run the configuration
configureCORS();