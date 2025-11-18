/**
 * Full-Text Search Utility
 * PostgreSQL full-text search using tsvector and tsquery
 */

const { query } = require('../db/pool');
const logger = require('./logger');

/**
 * Perform full-text search on blogs
 * Searches across title, summary, and tags using PostgreSQL's built-in full-text search
 * 
 * @param {string} searchQuery - User's search query
 * @param {number} limit - Maximum results to return
 * @param {number} offset - Number of results to skip
 * @returns {Promise<Object>} Search results and count
 */
const searchBlogs = async (searchQuery, limit = 20, offset = 0) => {
  try {
    if (!searchQuery || searchQuery.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    // Sanitize search query - remove special characters that could break the query
    const sanitizedQuery = searchQuery.trim().replace(/[^\w\s]/gi, ' ');

    // SQL query for full-text search with ranking
    // Uses the immutable function blogs_search_text() for better performance
    // Only searches published blogs by default
    const searchSQL = `
      SELECT 
        id,
        title,
        slug,
        "authorId",
        summary,
        tags,
        "contentUrl",
        "coverImageUrl",
        "readTime",
        views,
        likes,
        status,
        "createdAt",
        "updatedAt",
        ts_rank(blogs_search_text(title, summary, tags), plainto_tsquery('english', $1)) AS rank
      FROM blogs
      WHERE 
        "deletedAt" IS NULL
        AND status = 'published'
        AND blogs_search_text(title, summary, tags) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, "createdAt" DESC
      LIMIT $2 OFFSET $3
    `;

    // Count query for total results
    const countSQL = `
      SELECT COUNT(*) as total
      FROM blogs
      WHERE 
        "deletedAt" IS NULL
        AND status = 'published'
        AND blogs_search_text(title, summary, tags) @@ plainto_tsquery('english', $1)
    `;

    // Execute both queries
    const [searchResults, countResults] = await Promise.all([
      query(searchSQL, [sanitizedQuery, limit, offset]),
      query(countSQL, [sanitizedQuery]),
    ]);

    const total = parseInt(countResults.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    return {
      results: searchResults.rows,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    logger.error(`Search error: ${error.message}`, { error: error.stack, searchQuery });
    throw new Error(`Search failed: ${error.message}`);
  }
};

/**
 * Search blogs with additional filters
 * @param {Object} options - Search options
 * @param {string} options.query - Search query
 * @param {string[]} options.tags - Filter by tags
 * @param {string} options.status - Filter by status
 * @param {number} options.limit - Results limit
 * @param {number} options.offset - Results offset
 * @returns {Promise<Object>} Search results
 */
const advancedSearchBlogs = async (options) => {
  const {
    query: searchQuery,
    tags = [],
    status = 'published',
    limit = 20,
    offset = 0,
  } = options;

  try {
    let conditions = ['"deletedAt" IS NULL'];
    let params = [];
    let paramCount = 0;

    // Add full-text search condition
    if (searchQuery && searchQuery.trim()) {
      paramCount++;
      conditions.push(`blogs_search_text(title, summary, tags) @@ plainto_tsquery('english', $${paramCount})`);
      params.push(searchQuery.trim());
    }

    // Add status filter
    if (status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    // Add tags filter (blog must have at least one of the specified tags)
    if (tags.length > 0) {
      paramCount++;
      conditions.push(`tags && $${paramCount}`);
      params.push(tags);
    }

    const whereClause = conditions.join(' AND ');

    // Build search query
    const searchSQL = `
      SELECT 
        id,
        title,
        slug,
        "authorId",
        summary,
        tags,
        "contentUrl",
        "coverImageUrl",
        "readTime",
        views,
        likes,
        status,
        "createdAt",
        "updatedAt"
        ${searchQuery ? `, ts_rank(blogs_search_text(title, summary, tags), plainto_tsquery('english', $1)) AS rank` : ''}
      FROM blogs
      WHERE ${whereClause}
      ORDER BY ${searchQuery ? 'rank DESC,' : ''} "createdAt" DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const countSQL = `
      SELECT COUNT(*) as total
      FROM blogs
      WHERE ${whereClause}
    `;

    params.push(limit, offset);

    const [searchResults, countResults] = await Promise.all([
      query(searchSQL, params),
      query(countSQL, params.slice(0, -2)), // Remove limit and offset for count
    ]);

    const total = parseInt(countResults.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    return {
      results: searchResults.rows,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    logger.error(`Advanced search error: ${error.message}`, { error: error.stack, filters });
    throw new Error(`Advanced search failed: ${error.message}`);
  }
};

module.exports = {
  searchBlogs,
  advancedSearchBlogs,
};
