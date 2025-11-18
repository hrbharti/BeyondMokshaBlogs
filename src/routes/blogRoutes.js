/**
 * Blog Routes
 * Defines all API endpoints for blog operations
 */

const express = require('express');
const multer = require('multer');
const {
  getBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  permanentDeleteBlog,
  searchBlogsController,
  getBlogContent,
  getLatestBlogs,
  getPopularBlogs,
} = require('../controllers/blogController');
const {
  validateCreateBlog,
  validateUpdateBlog,
  validateBlogId,
  validateBlogSlug,
  validateBlogListQuery,
  validateSearchQuery,
  validateFileUpload,
} = require('../middleware/validateRequest');
const { requireApiKey } = require('../middleware/apiKeyAuth');
const {
  publicReadLimiter,
  adminWriteLimiter,
  adminDeleteLimiter,
} = require('../middleware/rateLimiter');

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
  },
});

/**
 * @route   GET /api/blogs
 * @desc    Get paginated list of blogs with optional filters
 * @query   page, limit, tags, search, status
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/', publicReadLimiter, validateBlogListQuery, getBlogs);

/**
 * @route   GET /api/blogs/feed/latest
 * @desc    Get latest published blogs
 * @query   limit (optional, default: 10, max: 50)
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/feed/latest', publicReadLimiter, getLatestBlogs);

/**
 * @route   GET /api/blogs/feed/popular
 * @desc    Get popular blogs sorted by views
 * @query   limit (optional, default: 10, max: 50)
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/feed/popular', publicReadLimiter, getPopularBlogs);

/**
 * @route   GET /api/blogs/search
 * @desc    Full-text search across blogs (title, summary, tags)
 * @query   query, page, limit
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/search', publicReadLimiter, validateSearchQuery, searchBlogsController);

/**
 * @route   GET /api/blogs/:slug
 * @desc    Get single blog by slug
 * @param   slug
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/:slug', publicReadLimiter, validateBlogSlug, getBlogBySlug);

/**
 * @route   GET /api/blogs/:slug/content
 * @desc    Get blog with presigned S3 URL for secure content access
 * @param   slug
 * @access  Public
 * @rateLimit 100 requests per 15 minutes per IP
 */
router.get('/:slug/content', publicReadLimiter, validateBlogSlug, getBlogContent);

/**
 * @route   POST /api/blogs
 * @desc    Create a new blog
 * @body    title, slug, summary, tags, authorId, readTime, status
 * @files   content (required), cover (optional)
 * @access  Protected - Requires valid API key
 * @rateLimit 50 requests per hour per API key
 */
router.post(
  '/',
  adminWriteLimiter,
  requireApiKey,
  upload.fields([
    { name: 'content', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  validateFileUpload,
  validateCreateBlog,
  createBlog
);

/**
 * @route   PUT /api/blogs/:id
 * @desc    Update blog metadata and optionally replace files
 * @param   id
 * @body    title, slug, summary, tags, authorId, readTime, status, views, likes
 * @files   content (optional), cover (optional)
 * @access  Protected - Requires valid API key
 * @rateLimit 50 requests per hour per API key
 */
router.put(
  '/:id',
  adminWriteLimiter,
  requireApiKey,
  upload.fields([
    { name: 'content', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  validateUpdateBlog,
  updateBlog
);

/**
 * @route   DELETE /api/blogs/:id
 * @desc    Soft delete a blog (sets deletedAt)
 * @param   id
 * @access  Protected - Requires valid API key
 * @rateLimit 20 requests per hour per API key
 */
router.delete('/:id', adminDeleteLimiter, requireApiKey, validateBlogId, deleteBlog);

/**
 * @route   DELETE /api/blogs/:id/permanent
 * @desc    Permanently delete blog from DB and S3
 * @param   id
 * @access  Protected - Requires valid API key
 * @rateLimit 20 requests per hour per API key
 */
router.delete('/:id/permanent', adminDeleteLimiter, requireApiKey, validateBlogId, permanentDeleteBlog);

module.exports = router;
