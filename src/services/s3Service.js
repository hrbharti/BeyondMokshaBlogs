/**
 * AWS S3 Service
 * Handles file uploads, deletions, and URL generation for blog content and images
 */

const { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand 
} = require('@aws-sdk/client-s3');
const path = require('path');
const logger = require('../utils/logger');

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_BUCKET = process.env.S3_BUCKET;
const S3_CDN_URL = process.env.S3_CDN_URL;

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} key - S3 object key (path)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} S3 URI format (s3://bucket/key)
 */
const uploadFile = async (fileBuffer, key, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // Make file publicly readable if not using CloudFront
      // ACL: 'public-read', // Uncomment if needed
    });

    await s3Client.send(command);
    
    logger.logS3Operation('UPLOAD', key, true);

    // Return S3 URI format for consistency
    // This format is stored in database and converted to presigned URLs when needed
    return `s3://${S3_BUCKET}/${key}`;
  } catch (error) {
    logger.logS3Operation('UPLOAD', key, false);
    logger.error(`S3 upload error: ${error.message}`);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Delete a file from S3
 * @param {string} key - S3 object key (path)
 * @returns {Promise<void>}
 */
const deleteFile = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    logger.logS3Operation('DELETE', key, true);
  } catch (error) {
    logger.logS3Operation('DELETE', key, false);
    logger.error(`S3 delete error: ${error.message}`);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Check if file exists in S3
 * @param {string} key - S3 object key (path)
 * @returns {Promise<boolean>}
 */
const fileExists = async (key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

/**
 * Upload blog content file
 * @param {Buffer} contentBuffer - File buffer
 * @param {number} blogId - Blog ID
 * @param {string} originalFilename - Original filename with extension
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} S3 URI of content file
 */
const uploadBlogContent = async (contentBuffer, blogId, originalFilename, contentType) => {
  // Use original filename as provided by user
  const key = `blogs/${blogId}/${originalFilename}`;
  return await uploadFile(contentBuffer, key, contentType);
};

/**
 * Upload blog cover image
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {number} blogId - Blog ID
 * @param {string} originalName - Original filename
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<string>} Public URL of cover image
 */
const uploadBlogCoverImage = async (imageBuffer, blogId, originalName, mimeType) => {
  const extension = path.extname(originalName);
  const key = `blogs/${blogId}/cover${extension}`;
  return await uploadFile(imageBuffer, key, mimeType);
};

/**
 * Delete blog files from S3
 * @param {number} blogId - Blog ID
 * @param {string} contentUrl - Current content URL (to get exact filename)
 * @param {string} coverImageUrl - Current cover image URL (to get exact filename)
 * @returns {Promise<void>}
 */
const deleteBlogFiles = async (blogId, contentUrl = null, coverImageUrl = null) => {
  try {
    // Delete content file if URL is provided
    if (contentUrl) {
      const contentKey = extractKeyFromUrl(contentUrl);
      if (contentKey && await fileExists(contentKey)) {
        await deleteFile(contentKey);
        logger.info(`Deleted content file: ${contentKey}`);
      }
    } else {
      // Fallback: try to delete legacy content files
      const contentKeys = [
        `blogs/${blogId}/content.html`,
        `blogs/${blogId}/content.md`,
        `blogs/${blogId}/content.docx`,
      ];

      for (const key of contentKeys) {
        if (await fileExists(key)) {
          await deleteFile(key);
          logger.info(`Deleted legacy content file: ${key}`);
        }
      }
    }

    // Delete cover image if URL is provided
    if (coverImageUrl) {
      const imageKey = extractKeyFromUrl(coverImageUrl);
      if (imageKey && await fileExists(imageKey)) {
        await deleteFile(imageKey);
        logger.info(`Deleted cover image: ${imageKey}`);
      }
    } else {
      // Fallback: try to delete common cover image extensions
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
      for (const ext of imageExtensions) {
        const key = `blogs/${blogId}/cover${ext}`;
        if (await fileExists(key)) {
          await deleteFile(key);
          logger.info(`Deleted legacy cover image: ${key}`);
        }
      }
    }
    
    logger.info(`Completed file deletion for blog ID: ${blogId}`);
  } catch (error) {
    logger.error(`Error deleting blog files for ID ${blogId}: ${error.message}`);
    // Don't throw - allow operation to continue even if S3 delete fails
  }
};

/**
 * Extract S3 key from URL (improved version)
 * Handles multiple URL formats:
 * - s3://bucket/key
 * - https://bucket.s3.region.amazonaws.com/key
 * - https://cdn-domain.com/key
 * @param {string} url - S3 or CDN URL
 * @returns {string|null} S3 key
 */
const extractKeyFromUrl = (url) => {
  if (!url) {
    logger.warn('extractKeyFromUrl: URL is null or undefined');
    return null;
  }
  
  try {
    // Handle S3 URI format (s3://bucket/key)
    if (url.startsWith('s3://')) {
      const key = url.replace(/^s3:\/\/[^/]+\//, '');
      logger.debug(`Extracted key from s3:// URL: ${key}`);
      return key;
    }
    
    // Handle CDN URLs
    if (S3_CDN_URL && url.startsWith(S3_CDN_URL)) {
      const key = url.replace(`${S3_CDN_URL}/`, '');
      logger.debug(`Extracted key from CDN URL: ${key}`);
      return key;
    }
    
    // Handle direct S3 HTTPS URLs (https://bucket.s3.region.amazonaws.com/key)
    const s3Match = url.match(/\.amazonaws\.com\/(.+)$/);
    if (s3Match && s3Match[1]) {
      logger.debug(`Extracted key from S3 HTTPS URL: ${s3Match[1]}`);
      return s3Match[1];
    }
    
    // If no pattern matches, log and return null
    logger.warn(`Could not extract key from URL: ${url}`);
    return null;
  } catch (error) {
    logger.error(`Error extracting key from URL: ${error.message}`);
    return null;
  }
};

/**
 * Replace blog content file
 * @param {string} oldUrl - Old content URL
 * @param {Buffer} newContentBuffer - New content buffer
 * @param {number} blogId - Blog ID
 * @param {string} originalFilename - Original filename with extension
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} New content URL
 */
const replaceBlogContent = async (oldUrl, newContentBuffer, blogId, originalFilename, contentType) => {
  // Delete old file if it exists
  const oldKey = extractKeyFromUrl(oldUrl);
  if (oldKey && await fileExists(oldKey)) {
    await deleteFile(oldKey);
  }
  
  // Upload new file with original filename
  return await uploadBlogContent(newContentBuffer, blogId, originalFilename, contentType);
};

/**
 * Replace blog cover image
 * @param {string} oldUrl - Old image URL
 * @param {Buffer} newImageBuffer - New image buffer
 * @param {number} blogId - Blog ID
 * @param {string} originalName - Original filename
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<string>} New image URL
 */
const replaceBlogCoverImage = async (oldUrl, newImageBuffer, blogId, originalName, mimeType) => {
  // Delete old file if it exists
  const oldKey = extractKeyFromUrl(oldUrl);
  if (oldKey && await fileExists(oldKey)) {
    await deleteFile(oldKey);
  }
  
  // Upload new file
  return await uploadBlogCoverImage(newImageBuffer, blogId, originalName, mimeType);
};

module.exports = {
  uploadFile,
  deleteFile,
  fileExists,
  uploadBlogContent,
  uploadBlogCoverImage,
  deleteBlogFiles,
  extractKeyFromUrl,
  replaceBlogContent,
  replaceBlogCoverImage,
  s3Client, // Export for health checks
};
