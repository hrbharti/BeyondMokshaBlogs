/**
 * Fix Blog 31 Content Extension
 * This script renames the incorrectly stored content file from .html to .docx
 */

const { S3Client, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const prisma = new PrismaClient();

async function fixBlog31() {
  try {
    const BUCKET = process.env.S3_BUCKET;
    const oldKey = 'blogs/31/content.html';
    const newKey = 'blogs/31/content.docx';

    console.log('🔧 Fixing blog 31 content extension...');

    // Step 1: Copy the file with correct extension
    console.log('📄 Copying file to correct extension...');
    await s3Client.send(new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${oldKey}`,
      Key: newKey,
      ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }));

    // Step 2: Delete the old incorrectly named file
    console.log('🗑️  Deleting old file...');
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: oldKey
    }));

    // Step 3: Update database with correct S3 URL
    console.log('💾 Updating database...');
    await prisma.blog.update({
      where: { id: 31 },
      data: {
        contentUrl: `s3://${BUCKET}/${newKey}`
      }
    });

    console.log('✅ Blog 31 fixed successfully!');
    console.log('📄 Content now stored as: blogs/31/content.docx');
    console.log('💾 Database updated with correct URL');

  } catch (error) {
    console.error('❌ Error fixing blog 31:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBlog31();