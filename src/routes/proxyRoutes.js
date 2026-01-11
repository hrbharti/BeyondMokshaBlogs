/**
 * Proxy route for serving S3 content through backend
 * This bypasses CORS issues by serving content through your own server
 */

const express = require('express');
const { generatePresignedUrl } = require('../utils/presignedUrl');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Proxy route to serve S3 content through backend
 * GET /api/content/:blogId/:filename
 */
router.get('/content/:blogId/:filename', async (req, res) => {
  try {
    const { blogId, filename } = req.params;
    
    // Validate filename to prevent path traversal
    const validFilenames = ['content.html', 'content.docx'];
    if (!validFilenames.includes(filename)) {
      return res.status(400).json({ 
        error: 'Invalid filename',
        message: 'Only content.html and content.docx are allowed'
      });
    }

    // Generate S3 key
    const s3Key = `blogs/${blogId}/${filename}`;
    
    // Generate presigned URL
    const presignedUrl = await generatePresignedUrl(`s3://${process.env.S3_BUCKET}/${s3Key}`, 300); // 5 min expiry
    
    // Fetch from S3 and stream to client
    const response = await fetch(presignedUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ 
          error: 'Content not found',
          message: `${filename} not found for blog ${blogId}`
        });
      }
      throw new Error(`S3 fetch failed: ${response.status} ${response.statusText}`);
    }

    // Set appropriate headers
    const contentType = filename.endsWith('.html') 
      ? 'text/html; charset=utf-8' 
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600', // 1 hour cache
      'Access-Control-Allow-Origin': '*', // Allow all origins for content
      'X-Content-Source': 'S3-Proxy'
    });

    // Stream the response
    const reader = response.body.getReader();
    
    const pump = async () => {
      try {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(value);
        pump();
      } catch (error) {
        logger.error(`Error streaming content for ${s3Key}:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Streaming error' });
        }
        res.end();
      }
    };

    pump();

    logger.info(`Served content via proxy: ${s3Key}`);

  } catch (error) {
    logger.error(`Content proxy error:`, error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to fetch content',
        message: error.message 
      });
    }
  }
});

/**
 * Proxy route for serving cover images
 * GET /api/images/:blogId/:filename
 */
router.get('/images/:blogId/:filename', async (req, res) => {
  try {
    const { blogId, filename } = req.params;
    
    // Validate image filename
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
    const hasValidExtension = validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    
    if (!hasValidExtension) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        message: 'Only image files are allowed'
      });
    }

    // Generate S3 key
    const s3Key = `blogs/${blogId}/${filename}`;
    
    // Generate presigned URL
    const presignedUrl = await generatePresignedUrl(`s3://${process.env.S3_BUCKET}/${s3Key}`, 3600); // 1 hour expiry
    
    // Fetch from S3 and stream to client
    const response = await fetch(presignedUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ 
          error: 'Image not found',
          message: `${filename} not found for blog ${blogId}`
        });
      }
      throw new Error(`S3 fetch failed: ${response.status} ${response.statusText}`);
    }

    // Get content type from S3 response or infer from extension
    const contentType = response.headers.get('content-type') || 
      (filename.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'image/*');
    
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // 24 hour cache for images
      'Access-Control-Allow-Origin': '*',
      'X-Content-Source': 'S3-Proxy'
    });

    // Stream the response
    const reader = response.body.getReader();
    
    const pump = async () => {
      try {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(value);
        pump();
      } catch (error) {
        logger.error(`Error streaming image for ${s3Key}:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Streaming error' });
        }
        res.end();
      }
    };

    pump();

    logger.info(`Served image via proxy: ${s3Key}`);

  } catch (error) {
    logger.error(`Image proxy error:`, error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to fetch image',
        message: error.message 
      });
    }
  }
});

module.exports = router;