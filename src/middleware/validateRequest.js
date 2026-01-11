/**
 * Request Validation Middleware
 * Uses express-validator to validate and sanitize request data
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

/**
 * Validation rules for creating a blog
 */
const validateCreateBlog = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
  
  body('tags')
    .optional({ values: 'falsy' })
    .customSanitizer((value) => {
      // Sanitize tags - convert invalid values to empty string
      if (!value || value === '' || value === null || value === undefined) {
        return ''; // Return empty string for falsy values
      }
      
      if (typeof value === 'string') {
        const trimmed = value.trim();
        // If it's too short to be valid JSON, return empty string
        if (trimmed.length < 2 || trimmed.length > 1000) {
          return '';
        }
        
        // Try to parse - if it fails, return empty string
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return value; // Valid JSON array string
          }
          return '';
        } catch (e) {
          return ''; // Invalid JSON, return empty string
        }
      }
      
      if (Array.isArray(value)) {
        return value; // Valid array
      }
      
      return ''; // Unknown type, return empty string
    })
    .custom((value) => {
      // Only validate if value is not empty after sanitization
      if (!value || value === '') {
        return true; // Skip validation for empty values
      }
      
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            throw new Error('Tags must be an array');
          }
          if (parsed.length > 20) {
            throw new Error('Cannot have more than 20 tags');
          }
          return true;
        } catch (e) {
          // Should not reach here due to sanitizer, but just in case
          return true; // Allow it to pass
        }
      }
      
      if (Array.isArray(value)) {
        if (value.length > 20) {
          throw new Error('Cannot have more than 20 tags');
        }
        return true;
      }
      
      return true; // Allow other cases
    }),
  
  body('readTime')
    .optional()
    .isInt({ min: 1 }).withMessage('Read time must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Validation rules for updating a blog
 */
const validateUpdateBlog = [
  param('id')
    .isInt({ min: 1 }).withMessage('Blog ID must be a positive integer'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 20) {
        throw new Error('Cannot have more than 20 tags');
      }
      return true;
    }),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Each tag must be between 2 and 50 characters'),
  
  body('readTime')
    .optional()
    .isInt({ min: 1 }).withMessage('Read time must be a positive integer'),
  
  body('views')
    .optional()
    .isInt({ min: 0 }).withMessage('Views must be a non-negative integer'),
  
  body('likes')
    .optional()
    .isInt({ min: 0 }).withMessage('Likes must be a non-negative integer'),
  
  handleValidationErrors,
];

/**
 * Validation rules for blog ID parameter
 */
const validateBlogId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Blog ID must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Validation rules for blog list query parameters
 */
const validateBlogListQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('tags')
    .optional()
    .custom((value) => {
      // Tags can be a comma-separated string or array
      if (typeof value === 'string') {
        return true;
      }
      if (Array.isArray(value)) {
        return true;
      }
      throw new Error('Tags must be a string or array');
    }),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Search query must be between 2 and 200 characters'),
  
  handleValidationErrors,
];

/**
 * Validation rules for search query
 */
const validateSearchQuery = [
  query('query')
    .trim()
    .notEmpty().withMessage('Search query is required')
    .isLength({ min: 2, max: 200 }).withMessage('Search query must be between 2 and 200 characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  handleValidationErrors,
];

/**
 * Validate file uploads
 */
const validateFileUpload = (req, res, next) => {
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
  
  // Check if content file is provided
  if (!req.files || !req.files.content) {
    return res.status(400).json({
      success: false,
      message: 'Content file is required',
    });
  }

  const contentFile = req.files.content[0];
  const coverFile = req.files.cover ? req.files.cover[0] : null;

  // Validate content file (Word documents only)
  const allowedContentTypes = (process.env.ALLOWED_CONTENT_TYPES || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(',');
  
  // Additional validation for Word files
  if (!allowedContentTypes.includes(contentFile.mimetype)) {
    return res.status(400).json({
      success: false,
      message: `Content file must be a Word document (.docx). Received: ${contentFile.mimetype}`,
      allowedTypes: allowedContentTypes,
    });
  }

  // Validate file extension as additional security
  const fileName = contentFile.originalname || '';
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  
  if (fileExtension !== 'docx') {
    return res.status(400).json({
      success: false,
      message: `File must have .docx extension. Received: .${fileExtension}`,
    });
  }

  if (contentFile.size > maxFileSize) {
    return res.status(400).json({
      success: false,
      message: `Content file size must not exceed ${maxFileSize / 1024 / 1024}MB`,
    });
  }

  // Validate cover image if provided
  if (coverFile) {
    const allowedImageTypes = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    if (!allowedImageTypes.includes(coverFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Cover image must be one of: ${allowedImageTypes.join(', ')}`,
      });
    }

    if (coverFile.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: `Cover image size must not exceed ${maxFileSize / 1024 / 1024}MB`,
      });
    }
  }

  next();
};

module.exports = {
  validateCreateBlog,
  validateUpdateBlog,
  validateBlogId,
  validateBlogListQuery,
  validateSearchQuery,
  validateFileUpload,
  handleValidationErrors,
};
