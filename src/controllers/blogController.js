/**
 * Blog Controller
 * Handles all blog-related business logic and database operations
 */

const prisma = require('../prismaClient');
const { searchBlogs } = require('../utils/search');
const {
  uploadBlogContent,
  uploadBlogCoverImage,
  replaceBlogContent,
  replaceBlogCoverImage,
  deleteBlogFiles,
} = require('../services/s3Service');
const { generatePresignedUrl, extractS3Key } = require('../utils/presignedUrl');
const { sanitizeHTMLToBuffer, validateHTMLStructure } = require('../utils/htmlSanitizer');
const logger = require('../utils/logger');

/**
 * Get paginated list of blogs
 * GET /api/blogs?page=1&limit=20&tags=tag1,tag2&search=query
 */
const getBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;

    // Parse tags - can be comma-separated string or array
    let tags = req.query.tags;
    if (tags && typeof tags === 'string') {
      tags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    } else if (!Array.isArray(tags)) {
      tags = [];
    }

    // Build where clause
    const where = {
      deletedAt: null,
    };

    // Add tags filter if provided
    if (tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute queries in parallel
    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        select: {
          id: true,
          title: true,
          tags: true,
          contentUrl: true,
          coverImageUrl: true,
          readTime: true,
          views: true,
          likes: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.blog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    logger.error(`Get blogs error: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get single blog by ID
 * GET /api/blogs/:id
 */
const getBlogById = async (req, res) => {
  try {
    const blogId = parseInt(req.params.id);

    const blog = await prisma.blog.findUnique({
      where: { 
        id: blogId,
      },
    });

    if (!blog || blog.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Increment view count asynchronously (don't wait for it)
    prisma.blog.update({
      where: { id: blog.id },
      data: { views: { increment: 1 } },
    }).catch(err => logger.error(`Failed to increment views: ${err.message}`));

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    logger.error(`Get blog error: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Create a new blog
 * POST /api/blogs
 * Expects multipart/form-data with:
 * - metadata fields (title, tags, readTime, etc.)
 * - content file (HTML or Markdown)
 * - cover image file (optional)
 */
const createBlog = async (req, res) => {
  try {
    const {
      title,
      tags,
      readTime,
    } = req.body;

    // Get uploaded files
    const contentFile = req.files.content[0];
    const coverFile = req.files.cover ? req.files.cover[0] : null;

    // Parse tags
    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        // Handle empty string or invalid JSON
        const trimmed = tags.trim();
        if (trimmed && trimmed.length > 0) {
          try {
            parsedTags = JSON.parse(trimmed);
            // Ensure it's an array
            if (!Array.isArray(parsedTags)) {
              parsedTags = [];
            }
          } catch (e) {
            logger.warn(`Failed to parse tags, using empty array: ${e.message}`);
            parsedTags = [];
          }
        }
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    // Create blog in database first to get ID
    const blog = await prisma.blog.create({
      data: {
        title,
        tags: parsedTags,
        contentUrl: 'placeholder', // Temporary
        coverImageUrl: null,
        readTime: readTime ? parseInt(readTime) : null,
      },
    });

    // Sanitize HTML content before uploading to S3
    logger.info(`Sanitizing HTML content for blog ID: ${blog.id}`);
    const sanitizedBuffer = sanitizeHTMLToBuffer(contentFile.buffer);
    
    // Validate HTML structure
    const validation = validateHTMLStructure(sanitizedBuffer.toString());
    if (validation.warnings.length > 0) {
      logger.warn(`HTML validation warnings for blog ${blog.id}: ${validation.warnings.join(', ')}`);
    }

    // Upload content to S3 using blog ID
    const contentUrl = await uploadBlogContent(
      sanitizedBuffer,
      blog.id,
      contentFile.mimetype
    );

    // Upload cover image to S3 if provided
    let coverImageUrl = null;
    if (coverFile) {
      coverImageUrl = await uploadBlogCoverImage(
        coverFile.buffer,
        blog.id,
        coverFile.originalname,
        coverFile.mimetype
      );
    }

    // Update blog with S3 URLs
    const updatedBlog = await prisma.blog.update({
      where: { id: blog.id },
      data: {
        contentUrl,
        coverImageUrl,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: updatedBlog,
    });
  } catch (error) {
    logger.error(`Create blog error: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create blog',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update a blog
 * PUT /api/blogs/:id
 * Can update metadata and optionally replace S3 files
 */
const updateBlog = async (req, res) => {
  try {
    const blogId = parseInt(req.params.id);
    
    const {
      title,
      tags,
      readTime,
      views,
      likes,
    } = req.body;

    // Check if blog exists
    const existingBlog = await prisma.blog.findUnique({
      where: { id: blogId },
    });

    if (!existingBlog || existingBlog.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Prepare update data
    const updateData = {};

    if (title) updateData.title = title;
    if (readTime !== undefined) updateData.readTime = readTime ? parseInt(readTime) : null;
    if (views !== undefined) updateData.views = parseInt(views);
    if (likes !== undefined) updateData.likes = parseInt(likes);

    // Parse tags if provided
    if (tags) {
      if (typeof tags === 'string') {
        updateData.tags = JSON.parse(tags);
      } else if (Array.isArray(tags)) {
        updateData.tags = tags;
      }
    }

    // Handle file uploads if provided
    if (req.files) {
      const contentFile = req.files.content ? req.files.content[0] : null;
      const coverFile = req.files.cover ? req.files.cover[0] : null;

      // Replace content file if provided
      if (contentFile) {
        // Sanitize HTML content
        logger.info(`Sanitizing updated HTML content for blog ID: ${blogId}`);
        const sanitizedBuffer = sanitizeHTMLToBuffer(contentFile.buffer);
        
        const newContentUrl = await replaceBlogContent(
          existingBlog.contentUrl,
          sanitizedBuffer,
          blogId,
          contentFile.mimetype
        );
        updateData.contentUrl = newContentUrl;
      }

      // Replace cover image if provided
      if (coverFile) {
        const newCoverUrl = await replaceBlogCoverImage(
          existingBlog.coverImageUrl,
          coverFile.buffer,
          blogId,
          coverFile.originalname,
          coverFile.mimetype
        );
        updateData.coverImageUrl = newCoverUrl;
      }
    }

    // Update blog in database
    const updatedBlog = await prisma.blog.update({
      where: { id: blogId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: updatedBlog,
    });
  } catch (error) {
    logger.error(`Update blog error: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to update blog',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Soft delete a blog
 * DELETE /api/blogs/:id
 */
const deleteBlog = async (req, res) => {
  try {
    const blogId = parseInt(req.params.id);

    // Check if blog exists
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
    });

    if (!blog || blog.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Soft delete - set deletedAt timestamp
    await prisma.blog.update({
      where: { id: blogId },
      data: { deletedAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    logger.error(`Delete blog error: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Hard delete a blog (optional - removes from DB and S3)
 * DELETE /api/blogs/:id/permanent
 */
const permanentDeleteBlog = async (req, res) => {
  try {
    const blogId = parseInt(req.params.id);

    // Check if blog exists
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Delete files from S3 using blog ID
    await deleteBlogFiles(blogId);

    // Delete from database
    await prisma.blog.delete({
      where: { id: blogId },
    });

    res.status(200).json({
      success: true,
      message: 'Blog permanently deleted',
    });
  } catch (error) {
    logger.error(`Permanent delete blog error: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete blog',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Search blogs using full-text search
 * GET /api/blogs/search?query=death+care&page=1&limit=20
 */
const searchBlogsController = async (req, res) => {
  try {
    const query = req.query.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    logger.info('Search request', { query, page, limit });

    const results = await searchBlogs(query, limit, offset);

    // Generate presigned URLs for search results (only if URLs exist)
    const blogsWithUrls = await Promise.all(
      results.results.map(async (blog) => {
        try {
          return {
            ...blog,
            contentUrl: blog.contentUrl ? await generatePresignedUrl(blog.contentUrl) : null,
            coverImageUrl: blog.coverImageUrl ? await generatePresignedUrl(blog.coverImageUrl) : null,
          };
        } catch (error) {
          // If URL generation fails, return the blog without presigned URLs
          logger.warn(`Failed to generate URLs for blog ${blog.id}:`, error.message);
          return {
            ...blog,
            contentUrl: null,
            coverImageUrl: null,
          };
        }
      })
    );

    logger.info('Search completed', { 
      query, 
      resultsCount: results.results.length, 
      total: results.pagination.total 
    });

    res.status(200).json({
      success: true,
      data: blogsWithUrls,
      pagination: results.pagination,
    });
  } catch (error) {
    logger.error(`Search blogs error: ${error.message}`, { error: error.stack, query: req.query.query });
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get blog content with HTML
 * GET /api/blogs/:id/content
 * Returns blog metadata along with the actual HTML content from S3
 */
const getBlogContent = async (req, res) => {
  try {
    const blogId = parseInt(req.params.id);

    // Get blog metadata
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
    });

    if (!blog || blog.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Increment view count asynchronously
    prisma.blog.update({
      where: { id: blog.id },
      data: { views: { increment: 1 } },
    }).catch(err => logger.error(`Failed to increment views: ${err.message}`));

    // Fetch content from S3
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Extract S3 key from contentUrl
    const s3Key = extractS3Key(blog.contentUrl);
    if (!s3Key) {
      return res.status(500).json({
        success: false,
        message: 'Invalid content URL format',
      });
    }

    // Fetch content from S3
    const getCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
    });

    const s3Response = await s3Client.send(getCommand);
    const htmlContent = await s3Response.Body.transformToString();

    // Generate presigned URL for cover image if exists
    let presignedCoverUrl = blog.coverImageUrl;
    if (blog.coverImageUrl) {
      const coverKey = extractS3Key(blog.coverImageUrl);
      if (coverKey) {
        presignedCoverUrl = await generatePresignedUrl(coverKey, 3600);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: blog.id,
        title: blog.title,
        tags: blog.tags,
        coverImageUrl: presignedCoverUrl, // Presigned URL for cover image
        readTime: blog.readTime,
        views: blog.views + 1, // Return incremented count
        likes: blog.likes,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
        content: htmlContent, // The actual HTML content from S3
      },
    });
  } catch (error) {
    logger.error(`Get blog content error: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get latest blogs (most recently created)
 * GET /api/blogs/feed/latest?limit=10
 */
const getLatestBlogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Validate limit
    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 50',
      });
    }

    logger.info('Latest blogs request', { limit });

    const latestBlogs = await prisma.blog.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        title: true,
        tags: true,
        contentUrl: true,
        coverImageUrl: true,
        readTime: true,
        views: true,
        likes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate presigned URLs for results
    const blogsWithUrls = await Promise.all(
      latestBlogs.map(async (blog) => {
        try {
          return {
            ...blog,
            contentUrl: blog.contentUrl ? await generatePresignedUrl(blog.contentUrl) : null,
            coverImageUrl: blog.coverImageUrl ? await generatePresignedUrl(blog.coverImageUrl) : null,
          };
        } catch (error) {
          logger.warn(`Failed to generate URLs for blog ${blog.id}:`, error.message);
          return {
            ...blog,
            contentUrl: null,
            coverImageUrl: null,
          };
        }
      })
    );

    logger.info('Latest blogs retrieved', { count: blogsWithUrls.length });

    res.status(200).json({
      success: true,
      data: blogsWithUrls,
      count: blogsWithUrls.length,
    });
  } catch (error) {
    logger.error(`Get latest blogs error: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest blogs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get popular blogs (sorted by views)
 * GET /api/blogs/feed/popular?limit=10
 */
const getPopularBlogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Validate limit
    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 50',
      });
    }

    logger.info('Popular blogs request', { limit });

    const popularBlogs = await prisma.blog.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        views: 'desc',
      },
      take: limit,
      select: {
        id: true,
        title: true,
        tags: true,
        contentUrl: true,
        coverImageUrl: true,
        readTime: true,
        views: true,
        likes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate presigned URLs for results
    const blogsWithUrls = await Promise.all(
      popularBlogs.map(async (blog) => {
        try {
          return {
            ...blog,
            contentUrl: blog.contentUrl ? await generatePresignedUrl(blog.contentUrl) : null,
            coverImageUrl: blog.coverImageUrl ? await generatePresignedUrl(blog.coverImageUrl) : null,
          };
        } catch (error) {
          logger.warn(`Failed to generate URLs for blog ${blog.id}:`, error.message);
          return {
            ...blog,
            contentUrl: null,
            coverImageUrl: null,
          };
        }
      })
    );

    logger.info('Popular blogs retrieved', { count: blogsWithUrls.length });

    res.status(200).json({
      success: true,
      data: blogsWithUrls,
      count: blogsWithUrls.length,
    });
  } catch (error) {
    logger.error(`Get popular blogs error: ${error.message}`, { error: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular blogs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  permanentDeleteBlog,
  searchBlogsController,
  getBlogContent,
  getLatestBlogs,
  getPopularBlogs,
};
