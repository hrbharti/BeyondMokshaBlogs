# BeyondMoksha Blog Backend

Production-ready Node.js backend API for the BeyondMoksha blog website, featuring PostgreSQL full-text search, AWS S3 storage, and comprehensive blog management capabilities.

## 🚀 Features

- **CRUD Operations**: Complete blog management with create, read, update, and soft delete
- **Full-Text Search**: PostgreSQL-powered search across titles, summaries, and tags
- **S3 Integration**: Automatic upload and management of blog content and images to AWS S3
- **Pagination**: Efficient data retrieval with pagination support
- **Tag-based Filtering**: Filter blogs by multiple tags
- **Soft Deletes**: Safe deletion with recovery capability
- **Connection Pooling**: Optimized database connections using pg pool
- **Input Validation**: Comprehensive request validation with express-validator
- **Security**: Helmet, CORS, compression, and secure headers
- **Production Ready**: Error handling, logging, and graceful shutdown

## 📋 Tech Stack

- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: AWS S3 (SDK v3)
- **Validation**: express-validator
- **File Upload**: Multer
- **Security**: Helmet, CORS
- **Connection Pool**: pg (node-postgres)

## 🛠️ Setup Instructions

### Prerequisites

- Node.js v18 or higher
- PostgreSQL database
- AWS account with S3 access
- npm or yarn

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Update the following variables in `.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/beyondmoksha_blogs?schema=public"

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_CDN_URL=https://your-cloudfront-domain.cloudfront.net

# API
CORS_ORIGIN=http://localhost:3000
```

### 3. Database Setup

Generate Prisma client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

This will:
- Create the `blogs` table
- Add indexes for slug, status, and deletedAt
- Create a GIN index for full-text search

### 4. Start the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## 📚 API Endpoints

### Health Check

```
GET /health
```

### Blog Operations

#### Get Paginated Blogs

```
GET /api/blogs?page=1&limit=20&tags=death-care,funeral&search=planning&status=published
```

Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `tags` (optional): Comma-separated tags
- `search` (optional): Search text
- `status` (optional): Filter by status (draft, published, archived)

#### Get Blog by Slug

```
GET /api/blogs/:slug
```

Returns full blog details and increments view count.

#### Create Blog

```
POST /api/blogs
Content-Type: multipart/form-data

Fields:
- title (required): Blog title
- slug (required): URL-friendly slug
- summary (optional): Brief description
- tags (optional): JSON array of tags
- authorId (optional): Author ID
- readTime (optional): Estimated read time in minutes
- status (optional): draft, published, or archived

Files:
- content (required): HTML or Markdown file
- cover (optional): Cover image (JPEG, PNG, WebP)
```

Example using curl:

```bash
curl -X POST http://localhost:5000/api/blogs \
  -F "title=Understanding Death Care" \
  -F "slug=understanding-death-care" \
  -F "summary=A comprehensive guide" \
  -F 'tags=["death-care","guide","planning"]' \
  -F "status=published" \
  -F "readTime=5" \
  -F "content=@./content.html" \
  -F "cover=@./cover.jpg"
```

#### Update Blog

```
PUT /api/blogs/:id
Content-Type: multipart/form-data

Same fields as create, all optional
Can optionally include new content and/or cover files
```

#### Soft Delete Blog

```
DELETE /api/blogs/:id
```

Sets `deletedAt` timestamp. Blog can be recovered by clearing this field.

#### Permanent Delete Blog

```
DELETE /api/blogs/:id/permanent
```

Permanently removes blog from database and deletes associated S3 files.

#### Full-Text Search

```
GET /api/search?query=funeral+planning&page=1&limit=20
```

Performs PostgreSQL full-text search across title, summary, and tags.
Results are ranked by relevance.

## 🗂️ Project Structure

```
BeyondMoksha_Blogs/
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── src/
│   ├── controllers/
│   │   └── blogController.js   # Business logic
│   ├── db/
│   │   └── pool.js            # PostgreSQL connection pool
│   ├── middleware/
│   │   └── validateRequest.js  # Request validation
│   ├── routes/
│   │   └── blogRoutes.js       # API routes
│   ├── services/
│   │   └── s3Service.js        # AWS S3 operations
│   ├── utils/
│   │   └── search.js           # Full-text search
│   ├── prismaClient.js         # Prisma client singleton
│   └── server.js               # Express app entry point
├── .env.example                # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🔍 Database Schema

```prisma
model Blog {
  id            Int       @id @default(autoincrement())
  title         String
  slug          String    @unique
  authorId      Int?
  summary       String?
  tags          String[]
  contentUrl    String
  coverImageUrl String?
  readTime      Int?
  views         Int       @default(0)
  likes         Int       @default(0)
  status        String    @default("draft")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
}
```

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Configurable cross-origin requests
- **Input Validation**: All inputs validated and sanitized
- **File Upload Limits**: Configurable max file size
- **SQL Injection Protection**: Parameterized queries
- **Error Handling**: Safe error responses (no stack traces in production)

## 🚦 Response Format

Success Response:
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "total": 800,
    "page": 1,
    "limit": 20,
    "totalPages": 40,
    "hasMore": true
  }
}
```

Error Response:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

## 📝 Available Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server with nodemon
npm run prisma:migrate # Run database migrations
npm run prisma:generate # Generate Prisma client
npm run prisma:studio  # Open Prisma Studio GUI
npm run prisma:deploy  # Deploy migrations in production
```

## 🌐 S3 File Structure

```
s3://your-bucket/
└── blogs/
    └── {slug}/
        ├── content.html (or .md)
        └── cover.jpg (or .png, .webp)
```

## 🔧 Advanced Configuration

### Custom File Size Limits

Set in `.env`:
```env
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### Allowed File Types

Configure in `.env`:
```env
ALLOWED_CONTENT_TYPES=application/vnd.openxmlformats-officedocument.wordprocessingml.document
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp,svg
```

### Redis Caching (Optional)

The code includes scaffolding for Redis caching. To enable:

1. Install Redis client: `npm install redis`
2. Configure in `.env`:
```env
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

## 🐛 Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check DATABASE_URL format
3. Ensure database exists: `createdb beyondmoksha_blogs`

### S3 Upload Failures

1. Verify AWS credentials
2. Check S3 bucket permissions
3. Ensure bucket region matches AWS_REGION

### Migration Errors

Reset and rerun migrations:
```bash
npx prisma migrate reset
npm run prisma:migrate
```

## 📄 License

MIT

## 👥 Support

For issues or questions, please open an issue in the repository.

---

Built with ❤️ for BeyondMoksha
