# 🚀 BeyondMoksha Blog API - Frontend Integration Guide

**Base URL**: `http://localhost:8000` (Development) | `https://your-domain.com` (Production)

**API Version**: 1.0.0  
**Last Updated**: November 18, 2025

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Response Format](#response-format)
5. [Public Endpoints](#public-endpoints)
6. [Protected Endpoints](#protected-endpoints)
7. [Error Handling](#error-handling)
8. [Code Examples](#code-examples)

---

## 🚦 Quick Start

### Base Configuration

```javascript
const API_BASE_URL = 'http://localhost:8000';
const API_PREFIX = '/api';

// For protected endpoints only
const ADMIN_API_KEY = 'your-api-key-here';
```

### Making Requests

```javascript
// Public endpoint example
fetch(`${API_BASE_URL}/api/blogs?page=1&limit=20`)
  .then(res => res.json())
  .then(data => console.log(data));

// Protected endpoint example
fetch(`${API_BASE_URL}/api/blogs`, {
  method: 'POST',
  headers: {
    'X-API-Key': ADMIN_API_KEY,
    'Content-Type': 'multipart/form-data'
  },
  body: formData
});
```

---

## 🔐 Authentication

### **API Key Authentication** (Protected Endpoints Only)

**Header Name**: `X-API-Key`  
**Required For**: Create, Update, Delete operations

```javascript
headers: {
  'X-API-Key': 'your-admin-api-key-here'
}
```

**Note**: All public read operations (GET) do NOT require authentication.

---

## ⏱️ Rate Limiting

| Endpoint Type | Rate Limit | Window |
|---------------|------------|--------|
| **Public Read** (GET) | 100 requests | 15 minutes |
| **Admin Write** (POST/PUT) | 50 requests | 1 hour |
| **Admin Delete** (DELETE) | 20 requests | 1 hour |
| **Health Check** | 1000 requests | 15 minutes |

**Rate Limit Headers** (included in responses):
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Time when limit resets (Unix timestamp)

---

## 📦 Response Format

### **Success Response**

```json
{
  "success": true,
  "data": { /* response data */ },
  "pagination": { /* optional, for paginated results */ }
}
```

### **Error Response**

```json
{
  "success": false,
  "message": "Error description",
  "errors": [ /* optional validation errors */ ],
  "error": "Stack trace (development only)"
}
```

### **Pagination Object**

```json
{
  "total": 800,
  "page": 1,
  "limit": 20,
  "totalPages": 40,
  "hasMore": true
}
```

---

## 🌐 Public Endpoints

### 1. Health Check

Check API server, database, and S3 connectivity status.

**Endpoint**: `GET /health`  
**Authentication**: None  
**Rate Limit**: 1000 requests / 15 minutes

#### Request

```bash
GET http://localhost:8000/health
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "BeyondMoksha Blog API is running",
  "timestamp": "2025-11-18T14:30:00.000Z",
  "uptime": 3600.5,
  "services": {
    "database": "connected",
    "s3": "connected"
  }
}
```

#### Response (503 Service Unavailable) - When services are down

```json
{
  "success": false,
  "message": "Database and S3 connection failed",
  "timestamp": "2025-11-18T14:30:00.000Z",
  "uptime": 3600.5,
  "services": {
    "database": "disconnected",
    "s3": "disconnected"
  }
}
```

---

### 2. Get All Blogs (Paginated)

Retrieve a paginated list of blogs with optional filtering.

**Endpoint**: `GET /api/blogs`  
**Authentication**: None  
**Rate Limit**: 100 requests / 15 minutes

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (min: 1) |
| `limit` | integer | No | 20 | Results per page (min: 1, max: 100) |
| `status` | string | No | published | Filter by status: `published`, `draft` |
| `tags` | string | No | - | Comma-separated tags: `death-care,funeral` |

#### Request Examples

```bash
# Get first page with default settings
GET /api/blogs

# Get page 2 with 10 results per page
GET /api/blogs?page=2&limit=10

# Get published blogs only
GET /api/blogs?status=published

# Filter by tags
GET /api/blogs?tags=funeral,death-care

# Combine filters
GET /api/blogs?page=1&limit=20&status=published&tags=planning
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Understanding Death Care Services",
      "slug": "understanding-death-care",
      "authorId": 1,
      "summary": "A comprehensive guide to death care services...",
      "tags": ["death-care", "funeral", "planning", "grief-support"],
      "contentUrl": "https://s3.amazonaws.com/...[presigned-url-valid-1-hour]",
      "coverImageUrl": "https://s3.amazonaws.com/...[presigned-url-valid-1-hour]",
      "readTime": 5,
      "views": 142,
      "likes": 23,
      "status": "published",
      "createdAt": "2025-11-15T07:44:32.230Z",
      "updatedAt": "2025-11-15T09:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 800,
    "page": 1,
    "limit": 20,
    "totalPages": 40,
    "hasMore": true
  }
}
```

---

### 3. Search Blogs (Full-Text Search)

Search blogs by title, summary, and tags using PostgreSQL full-text search.

**Endpoint**: `GET /api/blogs/search`  
**Authentication**: None  
**Rate Limit**: 100 requests / 15 minutes

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | **Yes** | - | Search query (min: 2, max: 200 chars) |
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Results per page (min: 1, max: 100) |

#### Request Examples

```bash
# Basic search
GET /api/blogs/search?query=funeral+planning

# Search with pagination
GET /api/blogs/search?query=death+care&page=1&limit=10

# Search single word
GET /api/blogs/search?query=memorial
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 7,
      "title": "Understanding Death Care Services",
      "slug": "understanding-death-care",
      "authorId": null,
      "summary": "A comprehensive guide to death care services...",
      "tags": ["death-care", "funeral", "planning", "grief-support"],
      "contentUrl": "https://s3.amazonaws.com/...[presigned-url]",
      "coverImageUrl": null,
      "readTime": 5,
      "views": 7,
      "likes": 0,
      "status": "published",
      "createdAt": "2025-11-15T07:44:32.230Z",
      "updatedAt": "2025-11-15T09:35:16.885Z",
      "rank": 0.082745634
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2,
    "hasMore": true
  }
}
```

**Note**: 
- Results are sorted by **relevance ranking** (higher `rank` = more relevant)
- Only **published** blogs are searchable
- Special characters are sanitized automatically

#### Error Response (400 Bad Request)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "query",
      "message": "Search query must be between 2 and 200 characters",
      "value": "a"
    }
  ]
}
```

---

### 4. Get Latest Blogs

Retrieve the most recently published blogs.

**Endpoint**: `GET /api/blogs/feed/latest`  
**Authentication**: None  
**Rate Limit**: 100 requests / 15 minutes

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Number of blogs (min: 1, max: 50) |

#### Request Examples

```bash
# Get 10 latest blogs (default)
GET /api/blogs/feed/latest

# Get 5 latest blogs
GET /api/blogs/feed/latest?limit=5

# Get maximum allowed (50)
GET /api/blogs/feed/latest?limit=50
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "title": "New Blog Post Title",
      "slug": "new-blog-post",
      "summary": "Latest blog summary...",
      "tags": ["tag1", "tag2"],
      "contentUrl": "https://s3.amazonaws.com/...[presigned-url]",
      "coverImageUrl": "https://s3.amazonaws.com/...[presigned-url]",
      "readTime": 8,
      "views": 42,
      "likes": 5,
      "createdAt": "2025-11-18T10:00:00.000Z",
      "updatedAt": "2025-11-18T10:00:00.000Z"
    }
  ],
  "count": 10
}
```

**Note**: Blogs are sorted by `createdAt` in **descending order** (newest first).

---

### 5. Get Popular Blogs

Retrieve the most viewed/popular blogs.

**Endpoint**: `GET /api/blogs/feed/popular`  
**Authentication**: None  
**Rate Limit**: 100 requests / 15 minutes

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Number of blogs (min: 1, max: 50) |

#### Request Examples

```bash
# Get 10 popular blogs (default)
GET /api/blogs/feed/popular

# Get 5 popular blogs
GET /api/blogs/feed/popular?limit=5
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Most Popular Blog",
      "slug": "most-popular-blog",
      "summary": "This blog has the most views...",
      "tags": ["popular", "trending"],
      "contentUrl": "https://s3.amazonaws.com/...[presigned-url]",
      "coverImageUrl": "https://s3.amazonaws.com/...[presigned-url]",
      "readTime": 10,
      "views": 5420,
      "likes": 342,
      "createdAt": "2025-10-15T10:00:00.000Z",
      "updatedAt": "2025-11-18T10:00:00.000Z"
    }
  ],
  "count": 10
}
```

**Note**: Blogs are sorted by `views` in **descending order** (most viewed first).

---

### 6. Get Single Blog by Slug

Retrieve detailed information about a specific blog using its slug. **This increments the view count.**

**Endpoint**: `GET /api/blogs/:slug`  
**Authentication**: None  
**Rate Limit**: 100 requests / 15 minutes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | **Yes** | Blog slug (URL-friendly identifier) |

#### Request Example

```bash
GET /api/blogs/understanding-death-care
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": 7,
    "title": "Understanding Death Care Services",
    "slug": "understanding-death-care",
    "authorId": null,
    "summary": "A comprehensive guide to death care services and why pre-planning matters for families",
    "tags": ["death-care", "funeral", "planning", "grief-support"],
    "contentUrl": "https://s3.amazonaws.com/...[presigned-url-1-hour-valid]",
    "coverImageUrl": null,
    "readTime": 5,
    "views": 8,
    "likes": 0,
    "status": "published",
    "createdAt": "2025-11-15T07:44:32.230Z",
    "updatedAt": "2025-11-15T09:35:16.885Z"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "message": "Blog not found"
}
```

**Important Notes**:
- ✅ **View count is automatically incremented** with each request
- ✅ Presigned URLs are valid for **1 hour**
- ✅ Returns `null` for missing cover images

---

### 7. Get Blog Content with HTML

Retrieve blog metadata along with the actual HTML content from S3.

**Endpoint**: `GET /api/blogs/:slug/content`  
**Authentication**: None  
**Rate Limit**: 100 requests / 15 minutes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | **Yes** | Blog slug |

#### Request Example

```bash
GET /api/blogs/understanding-death-care/content
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": 7,
    "title": "Understanding Death Care Services",
    "slug": "understanding-death-care",
    "authorId": null,
    "summary": "A comprehensive guide...",
    "tags": ["death-care", "funeral", "planning"],
    "coverImageUrl": "https://s3.amazonaws.com/...[presigned-url]",
    "readTime": 5,
    "views": 9,
    "likes": 0,
    "status": "published",
    "createdAt": "2025-11-15T07:44:32.230Z",
    "updatedAt": "2025-11-15T09:35:16.885Z",
    "content": "<h1>Understanding Death Care Services</h1><p>Full HTML content here...</p>"
  }
}
```

**Important Notes**:
- ✅ Returns **full HTML content** from S3
- ✅ Content is **sanitized** using DOMPurify
- ✅ View count is **incremented**
- ⚠️ May take slightly longer than slug endpoint (fetches from S3)

---

## 🔒 Protected Endpoints

**All protected endpoints require the `X-API-Key` header.**

---

### 8. Create Blog

Create a new blog post with content and optional cover image.

**Endpoint**: `POST /api/blogs`  
**Authentication**: **Required** (`X-API-Key`)  
**Rate Limit**: 50 requests / 1 hour  
**Content-Type**: `multipart/form-data`

#### Headers

```javascript
{
  'X-API-Key': 'your-admin-api-key',
  'Content-Type': 'multipart/form-data'
}
```

#### Form Data Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **Yes** | Blog title (3-200 chars) |
| `slug` | string | **Yes** | URL-friendly slug (3-200 chars, lowercase, hyphens) |
| `summary` | string | **Yes** | Blog summary (10-500 chars) |
| `tags` | JSON string | **Yes** | Array of tags: `["tag1", "tag2"]` |
| `status` | string | **Yes** | `published` or `draft` |
| `authorId` | integer | No | Author ID |
| `readTime` | integer | **Yes** | Reading time in minutes (1-60) |
| `content` | file | **Yes** | HTML/Markdown file (max 10MB) |
| `cover` | file | No | Cover image: jpg, jpeg, png, webp, gif (max 10MB) |

#### Request Example (JavaScript)

```javascript
const formData = new FormData();
formData.append('title', 'Understanding Death Care');
formData.append('slug', 'understanding-death-care');
formData.append('summary', 'A comprehensive guide to death care services');
formData.append('tags', JSON.stringify(['death-care', 'planning', 'funeral']));
formData.append('status', 'published');
formData.append('readTime', '8');
formData.append('authorId', '1');
formData.append('content', contentFile); // File object
formData.append('cover', coverImageFile); // File object

fetch('http://localhost:8000/api/blogs', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your-api-key'
  },
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": 8,
    "title": "Understanding Death Care",
    "slug": "understanding-death-care",
    "authorId": 1,
    "summary": "A comprehensive guide to death care services",
    "tags": ["death-care", "planning", "funeral"],
    "contentUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/content.html",
    "coverImageUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/cover.jpg",
    "readTime": 8,
    "views": 0,
    "likes": 0,
    "status": "published",
    "createdAt": "2025-11-18T10:00:00.000Z",
    "updatedAt": "2025-11-18T10:00:00.000Z",
    "deletedAt": null
  },
  "message": "Blog created successfully"
}
```

#### Error Response (400 Bad Request)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title must be between 3 and 200 characters",
      "value": "AB"
    },
    {
      "field": "slug",
      "message": "Slug must contain only lowercase letters, numbers, and hyphens",
      "value": "Invalid_Slug"
    }
  ]
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "message": "Unauthorized: Invalid or missing API key"
}
```

---

### 9. Update Blog

Update blog metadata and optionally replace content or cover image.

**Endpoint**: `PUT /api/blogs/:id`  
**Authentication**: **Required** (`X-API-Key`)  
**Rate Limit**: 50 requests / 1 hour  
**Content-Type**: `multipart/form-data`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | **Yes** | Blog ID |

#### Headers

```javascript
{
  'X-API-Key': 'your-admin-api-key',
  'Content-Type': 'multipart/form-data'
}
```

#### Form Data Fields (All Optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | Updated title |
| `slug` | string | No | Updated slug |
| `summary` | string | No | Updated summary |
| `tags` | JSON string | No | Updated tags array |
| `status` | string | No | `published` or `draft` |
| `authorId` | integer | No | Updated author ID |
| `readTime` | integer | No | Updated read time |
| `views` | integer | No | Updated view count |
| `likes` | integer | No | Updated likes count |
| `content` | file | No | New content file (replaces old) |
| `cover` | file | No | New cover image (replaces old) |

#### Request Example

```javascript
const formData = new FormData();
formData.append('title', 'Updated Title');
formData.append('status', 'published');
formData.append('views', '150');
formData.append('likes', '25');
// Optionally add new files
formData.append('content', newContentFile);
formData.append('cover', newCoverImage);

fetch('http://localhost:8000/api/blogs/7', {
  method: 'PUT',
  headers: {
    'X-API-Key': 'your-api-key'
  },
  body: formData
});
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": 7,
    "title": "Updated Title",
    "slug": "understanding-death-care",
    "summary": "A comprehensive guide...",
    "tags": ["death-care", "funeral"],
    "contentUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/content.html",
    "coverImageUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/cover.jpg",
    "readTime": 5,
    "views": 150,
    "likes": 25,
    "status": "published",
    "createdAt": "2025-11-15T07:44:32.230Z",
    "updatedAt": "2025-11-18T11:00:00.000Z",
    "deletedAt": null
  },
  "message": "Blog updated successfully"
}
```

**Important Notes**:
- ✅ Only provide fields you want to update
- ✅ New files automatically replace old ones in S3
- ✅ Old S3 files are deleted when replaced

---

### 10. Soft Delete Blog

Soft delete a blog (sets `deletedAt` timestamp, doesn't remove from database or S3).

**Endpoint**: `DELETE /api/blogs/:id`  
**Authentication**: **Required** (`X-API-Key`)  
**Rate Limit**: 20 requests / 1 hour

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | **Yes** | Blog ID |

#### Headers

```javascript
{
  'X-API-Key': 'your-admin-api-key'
}
```

#### Request Example

```bash
DELETE /api/blogs/7
Headers: X-API-Key: your-api-key
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Blog soft deleted successfully",
  "data": {
    "id": 7,
    "title": "Understanding Death Care Services",
    "deletedAt": "2025-11-18T12:00:00.000Z"
  }
}
```

**Important Notes**:
- ✅ Blog is **hidden** from all public queries
- ✅ Data remains in database (can be restored)
- ✅ S3 files are **NOT deleted**

---

### 11. Permanent Delete Blog

Permanently delete a blog from database AND S3 (cannot be undone).

**Endpoint**: `DELETE /api/blogs/:id/permanent`  
**Authentication**: **Required** (`X-API-Key`)  
**Rate Limit**: 20 requests / 1 hour

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | **Yes** | Blog ID |

#### Headers

```javascript
{
  'X-API-Key': 'your-admin-api-key'
}
```

#### Request Example

```bash
DELETE /api/blogs/7/permanent
Headers: X-API-Key: your-api-key
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Blog permanently deleted from database and S3",
  "data": {
    "id": 7,
    "title": "Understanding Death Care Services"
  }
}
```

**⚠️ WARNING**:
- ❌ This action is **IRREVERSIBLE**
- ❌ Deletes from **database AND S3**
- ❌ All content and images are **permanently lost**

---

## ❌ Error Handling

### HTTP Status Codes

| Code | Meaning | When It Occurs |
|------|---------|----------------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (blog created) |
| 400 | Bad Request | Validation errors, invalid input |
| 401 | Unauthorized | Missing or invalid API key |
| 404 | Not Found | Blog not found, invalid endpoint |
| 409 | Conflict | Duplicate slug |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Database or S3 down |

### Error Response Examples

#### Validation Error (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title must be between 3 and 200 characters",
      "value": "AB"
    }
  ]
}
```

#### Authentication Error (401)

```json
{
  "success": false,
  "message": "Unauthorized: Invalid or missing API key"
}
```

#### Not Found Error (404)

```json
{
  "success": false,
  "message": "Blog not found"
}
```

#### Rate Limit Error (429)

```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

#### Duplicate Slug Error (409)

```json
{
  "success": false,
  "message": "A record with this value already exists"
}
```

---

## 💻 Code Examples

### React Example - Search Component

```jsx
import { useState, useEffect } from 'react';

function SearchBlogs() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) return;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8000/api/blogs/search?query=${encodeURIComponent(query)}&limit=20`
        );
        const data = await response.json();
        
        if (data.success) {
          setResults(data.data);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search blogs..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      
      {loading && <p>Searching...</p>}
      
      <div>
        {results.map(blog => (
          <div key={blog.id}>
            <h3>{blog.title}</h3>
            <p>{blog.summary}</p>
            <span>Relevance: {blog.rank.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Vanilla JavaScript - Latest Blogs

```javascript
async function fetchLatestBlogs(limit = 10) {
  try {
    const response = await fetch(
      `http://localhost:8000/api/blogs/feed/latest?limit=${limit}`
    );
    const data = await response.json();
    
    if (data.success) {
      displayBlogs(data.data);
    } else {
      console.error('Failed to fetch blogs:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

function displayBlogs(blogs) {
  const container = document.getElementById('latest-blogs');
  
  container.innerHTML = blogs.map(blog => `
    <article>
      <img src="${blog.coverImageUrl || 'default.jpg'}" alt="${blog.title}">
      <h2><a href="/blog/${blog.slug}">${blog.title}</a></h2>
      <p>${blog.summary}</p>
      <div>
        <span>📖 ${blog.readTime} min read</span>
        <span>👁️ ${blog.views} views</span>
        <span>❤️ ${blog.likes} likes</span>
      </div>
    </article>
  `).join('');
}

// Call on page load
fetchLatestBlogs(5);
```

### Axios Example - Create Blog

```javascript
import axios from 'axios';

async function createBlog(blogData, contentFile, coverFile) {
  const formData = new FormData();
  
  // Add metadata
  formData.append('title', blogData.title);
  formData.append('slug', blogData.slug);
  formData.append('summary', blogData.summary);
  formData.append('tags', JSON.stringify(blogData.tags));
  formData.append('status', 'published');
  formData.append('readTime', blogData.readTime);
  formData.append('authorId', blogData.authorId);
  
  // Add files
  formData.append('content', contentFile);
  if (coverFile) {
    formData.append('cover', coverFile);
  }
  
  try {
    const response = await axios.post(
      'http://localhost:8000/api/blogs',
      formData,
      {
        headers: {
          'X-API-Key': 'your-api-key-here',
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    console.log('Blog created:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Error:', error.response.data);
    }
    throw error;
  }
}
```

### Fetch Example - Update Views

```javascript
async function updateBlogViews(blogId, newViewCount) {
  const formData = new FormData();
  formData.append('views', newViewCount.toString());
  
  try {
    const response = await fetch(`http://localhost:8000/api/blogs/${blogId}`, {
      method: 'PUT',
      headers: {
        'X-API-Key': 'your-api-key'
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Views updated:', data.data.views);
    }
  } catch (error) {
    console.error('Update failed:', error);
  }
}
```

---

## 🎯 Quick Reference

### All Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/health` | ❌ | Health check |
| GET | `/api/blogs` | ❌ | List all blogs |
| GET | `/api/blogs/search` | ❌ | Search blogs |
| GET | `/api/blogs/feed/latest` | ❌ | Latest blogs |
| GET | `/api/blogs/feed/popular` | ❌ | Popular blogs |
| GET | `/api/blogs/:slug` | ❌ | Get blog by slug |
| GET | `/api/blogs/:slug/content` | ❌ | Get blog with content |
| POST | `/api/blogs` | ✅ | Create blog |
| PUT | `/api/blogs/:id` | ✅ | Update blog |
| DELETE | `/api/blogs/:id` | ✅ | Soft delete |
| DELETE | `/api/blogs/:id/permanent` | ✅ | Permanent delete |

---

## 📌 Important Notes

### Presigned URLs
- ✅ All S3 URLs are **presigned** and valid for **1 hour**
- ✅ URLs automatically regenerated on each request
- ⚠️ Don't cache URLs for more than 1 hour

### View Counter
- ✅ Views auto-increment when accessing:
  - `GET /api/blogs/:slug`
  - `GET /api/blogs/:slug/content`
- ❌ Views do NOT increment when:
  - Listing all blogs
  - Searching blogs
  - Getting latest/popular feeds

### Tags
- ✅ Always send as **JSON string array**: `["tag1", "tag2"]`
- ✅ Tags are case-sensitive
- ✅ Use hyphens for multi-word tags: `death-care`

### Status
- `published` - Visible to public
- `draft` - Hidden from public (admin only)

### File Uploads
- ✅ Max file size: **10MB**
- ✅ Content: HTML or Markdown files
- ✅ Cover images: JPG, JPEG, PNG, WebP, GIF

---

## 🆘 Support

**Questions?** Contact the backend team:
- GitHub Issues: [BeyondMokshaBlogs Issues](https://github.com/NishantTomer5601/BeyondMokshaBlogs/issues)
- Documentation: See `BACKEND_API_DOCUMENTATION.md` for more details

**Happy Coding!** 🚀
