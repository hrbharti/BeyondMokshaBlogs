/**
 * Generate Presigned URLs for S3 Content
 * Allows secure temporary access to private S3 files
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('./logger');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate presigned URL for S3 object
 * @param {string} s3Url - S3 URL or key (e.g., 's3://bucket/key' or 'blogs/my-blog/content.html')
 * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
const generatePresignedUrl = async (s3Url, expiresIn = 3600) => {
  try {
    if (!s3Url) {
      throw new Error('S3 URL is required');
    }

    // Extract key from URL if it's a full URL, otherwise use as-is
    const key = extractS3Key(s3Url) || s3Url;

    if (!key) {
      throw new Error('Could not extract S3 key from URL');
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn, // URL valid for 1 hour by default
    });

    logger.debug(`Generated presigned URL for key: ${presignedUrl} (expires in ${expiresIn}s)`);
    return presignedUrl;
  } catch (error) {
    logger.error(`Error generating presigned URL for ${s3Url}: ${error.message}`);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

/**
 * Extract S3 key from contentUrl (improved version)
 * Handles multiple URL formats:
 * - s3://bucket/key (preferred)
 * - https://bucket.s3.region.amazonaws.com/key
 * - https://cdn-domain.com/key
 * @param {string} contentUrl - Full S3 URL
 * @returns {string|null} S3 key
 */
const extractS3Key = (contentUrl) => {
  if (!contentUrl) {
    logger.warn('extractS3Key: contentUrl is null or undefined');
    return null;
  }

  const S3_CDN_URL = process.env.S3_CDN_URL;
  
  try {
    // Handle S3 URI format (s3://bucket/key) - PREFERRED FORMAT
    if (contentUrl.startsWith('s3://')) {
      const key = contentUrl.replace(/^s3:\/\/[^/]+\//, '');
      logger.debug(`Extracted key from s3:// URI: ${key}`);
      return key;
    }
    
    // Handle CDN URLs
    if (S3_CDN_URL && contentUrl.startsWith(S3_CDN_URL)) {
      const key = contentUrl.replace(`${S3_CDN_URL}/`, '');
      logger.debug(`Extracted key from CDN URL: ${key}`);
      return key;
    }
    
    // Handle HTTPS S3 URLs (https://bucket.s3.region.amazonaws.com/key)
    const s3Match = contentUrl.match(/\.amazonaws\.com\/(.+)$/);
    if (s3Match && s3Match[1]) {
      logger.debug(`Extracted key from HTTPS S3 URL: ${s3Match[1]}`);
      return s3Match[1];
    }
    
    // If no pattern matches, log warning and return null
    logger.warn(`Could not extract S3 key from URL: ${contentUrl}`);
    return null;
  } catch (error) {
    logger.error(`Error extracting S3 key: ${error.message}`);
    return null;
  }
};

module.exports = {
  generatePresignedUrl,
  extractS3Key,
};
