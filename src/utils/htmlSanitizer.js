/**
 * HTML Sanitizer Utility
 * Sanitizes user-uploaded HTML content to prevent XSS attacks
 */

const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const logger = require('./logger');

// Initialize DOMPurify once
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML content
 * Removes potentially dangerous scripts, iframes, and other XSS vectors
 * while preserving safe HTML tags and attributes
 * 
 * @param {string|Buffer} htmlContent - Raw HTML content
 * @returns {string} Sanitized HTML content
 */
const sanitizeHTML = (htmlContent) => {
  try {
    
    // Convert Buffer to string if needed
    const htmlString = Buffer.isBuffer(htmlContent) 
      ? htmlContent.toString('utf-8') 
      : htmlContent;

    if (!htmlString || htmlString.trim().length === 0) {
      logger.warn('sanitizeHTML: Empty or null HTML content provided');
      return '';
    }

    // Configure DOMPurify options
    const config = {
      // Allowed tags - comprehensive list for blog content
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup',
        'ul', 'ol', 'li',
        'a', 'img',
        'blockquote', 'pre', 'code',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'nav',
        'figure', 'figcaption',
        'dl', 'dt', 'dd',
        'abbr', 'cite', 'q', 'time',
        'video', 'audio', 'source',
      ],
      
      // Allowed attributes
      ALLOWED_ATTR: [
        'href', 'title', 'target', 'rel',
        'src', 'alt', 'width', 'height',
        'class', 'id',
        'colspan', 'rowspan',
        'type', 'start',
        'controls', 'autoplay', 'loop', 'muted',
        'datetime',
      ],
      
      // Allow only specific protocols in href/src
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      
      // Keep safe HTML entities
      KEEP_CONTENT: true,
      
      // Return entire HTML document (including DOCTYPE, html, head, body tags)
      WHOLE_DOCUMENT: true,
      
      // Return DOM instead of string for better performance (false = return string)
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      
      // Force body content only (remove doctype, html, head tags)
      FORCE_BODY: false,
      
      // Sanitize inline styles
      ALLOW_DATA_ATTR: false, // Disable data-* attributes
      
      // Additional security options
      SAFE_FOR_TEMPLATES: true,
    };

    // Sanitize the HTML
    const sanitized = DOMPurify.sanitize(htmlString, config);

    // Log sanitization metrics
    const originalLength = htmlString.length;
    const sanitizedLength = sanitized.length;
    const reduction = originalLength - sanitizedLength;
    
    if (reduction > 0) {
      logger.info(`HTML sanitized: removed ${reduction} characters (${((reduction/originalLength)*100).toFixed(2)}%)`);
    } else {
      logger.debug('HTML sanitized: no changes needed');
    }

    return sanitized;
  } catch (error) {
    logger.error(`HTML sanitization error: ${error.message}`);
    throw new Error(`Failed to sanitize HTML: ${error.message}`);
  }
};

/**
 * Sanitize HTML and convert to Buffer
 * Convenience method for uploading sanitized HTML to S3
 * 
 * @param {string|Buffer} htmlContent - Raw HTML content
 * @returns {Buffer} Sanitized HTML as Buffer
 */
const sanitizeHTMLToBuffer = (htmlContent) => {
  const sanitized = sanitizeHTML(htmlContent);
  return Buffer.from(sanitized, 'utf-8');
};

/**
 * Validate HTML structure
 * Checks if HTML has basic required elements
 * 
 * @param {string} htmlContent - HTML content to validate
 * @returns {Object} Validation result with errors/warnings
 */
const validateHTMLStructure = (htmlContent) => {
  const errors = [];
  const warnings = [];

  try {
    // Check if content is not empty
    if (!htmlContent || htmlContent.trim().length === 0) {
      errors.push('HTML content is empty');
      return { valid: false, errors, warnings };
    }

    // Check for basic HTML structure
    if (!htmlContent.includes('<') || !htmlContent.includes('>')) {
      warnings.push('Content does not appear to be valid HTML');
    }

    // Check for potentially dangerous patterns (even after sanitization)
    const dangerousPatterns = [
      { pattern: /<script/i, message: 'Contains script tags' },
      { pattern: /javascript:/i, message: 'Contains javascript: protocol' },
      { pattern: /on\w+\s*=/i, message: 'Contains inline event handlers' },
      { pattern: /<iframe/i, message: 'Contains iframe tags' },
    ];

    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(htmlContent)) {
        warnings.push(message);
      }
    });

    const valid = errors.length === 0;
    return { valid, errors, warnings };
  } catch (error) {
    logger.error(`HTML validation error: ${error.message}`);
    return {
      valid: false,
      errors: [`Validation failed: ${error.message}`],
      warnings,
    };
  }
};

module.exports = {
  sanitizeHTML,
  sanitizeHTMLToBuffer,
  validateHTMLStructure,
};
