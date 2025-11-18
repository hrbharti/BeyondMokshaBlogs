# BeyondMoksha Blog Backend - Quick Start Guide

## 📦 Installation Steps

### 1. Clone and Navigate
```bash
cd /Users/nishanttomer/Desktop/BeyondMoksha_Blogs
```

### 2. Install Dependencies
```bash
npm install
```

This will install:
- Express.js (web framework)
- Prisma ORM (database toolkit)
- AWS SDK v3 (S3 storage)
- pg (PostgreSQL connection pooling)
- express-validator (input validation)
- helmet, cors, compression (security & performance)
- multer (file uploads)
- dotenv (environment variables)

### 3. Setup Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:
```bash
nano .env  # or use any text editor
```

**Required Configuration:**
```env
# Database
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/beyondmoksha_blogs"

# AWS S3
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_CDN_URL=https://your-cdn-url.cloudfront.net

# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 4. Database Setup

**Create PostgreSQL Database:**
```bash
# If using psql
psql -U postgres
CREATE DATABASE beyondmoksha_blogs;
\q
```

**Generate Prisma Client:**
```bash
npm run prisma:generate
```

**Run Migrations:**
```bash
npm run prisma:migrate
```

This creates:
- `blogs` table with all fields
- Unique index on `slug`
- Regular indexes on `status` and `deletedAt`
- GIN index for full-text search

**Verify Migration:**
```bash
npm run prisma:studio
```
Opens Prisma Studio in browser at http://localhost:5555

### 5. Configure AWS S3

**Create S3 Bucket:**
1. Log into AWS Console
2. Navigate to S3
3. Create bucket (e.g., `beyondmoksha-blogs`)
4. Configure bucket permissions:
   - Unblock public access (if needed)
   - Add CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

**Create IAM User:**
1. IAM Console → Users → Add user
2. Access type: Programmatic access
3. Attach policy: `AmazonS3FullAccess`
4. Save Access Key ID and Secret Access Key
5. Add to `.env` file

**Optional: Setup CloudFront CDN:**
- Create CloudFront distribution pointing to S3 bucket
- Add CDN URL to `S3_CDN_URL` in `.env`

### 6. Start the Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

**Verify Server is Running:**
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "BeyondMoksha Blog API is running",
  "timestamp": "2025-01-11T10:00:00.000Z",
  "uptime": 1.234
}
```

## 🧪 Testing the API

### Test with Sample Data

**1. Create a test blog:**
```bash
cd /Users/nishanttomer/Desktop/BeyondMoksha_Blogs

curl -X POST http://localhost:5000/api/blogs \
  -F "title=Understanding Death Care" \
  -F "slug=understanding-death-care" \
  -F "summary=A comprehensive guide to death care services" \
  -F 'tags=["death-care","planning","guide"]' \
  -F "status=published" \
  -F "readTime=8" \
  -F "content=@./path/to/your-content.html"
```

**2. Get all blogs:**
```bash
curl http://localhost:5000/api/blogs?status=published
```

**3. Get single blog:**
```bash
curl http://localhost:5000/api/blogs/understanding-death-care
```

**4. Search blogs:**
```bash
curl "http://localhost:5000/api/search?query=death+care"
```

## 🔧 Common Issues & Solutions

### Issue: Database Connection Failed
**Solution:**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `.env`
- Test connection: `psql -d beyondmoksha_blogs`

### Issue: S3 Upload Failed
**Solution:**
- Verify AWS credentials in `.env`
- Check S3 bucket exists and is in correct region
- Verify IAM user has S3 permissions
- Check bucket CORS configuration

### Issue: Migration Failed
**Solution:**
```bash
# Reset database
npx prisma migrate reset

# Regenerate client
npm run prisma:generate

# Run migrations again
npm run prisma:migrate
```

### Issue: Module Not Found
**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port Already in Use
**Solution:**
- Change PORT in `.env` to different value (e.g., 5001)
- Or kill process using port 5000:
```bash
lsof -ti:5000 | xargs kill -9
```

## 📊 Database Management

### View Data in Prisma Studio
```bash
npm run prisma:studio
```

### Create Manual Migration
```bash
npx prisma migrate dev --name your_migration_name
```

### Apply Migrations in Production
```bash
npm run prisma:deploy
```

### Reset Database (Development Only)
```bash
npx prisma migrate reset
```

## 🚀 Deployment Checklist

Before deploying to production:

1. **Environment Variables:**
   - [ ] Set `NODE_ENV=production`
   - [ ] Use production DATABASE_URL
   - [ ] Configure production CORS_ORIGIN
   - [ ] Set secure AWS credentials

2. **Database:**
   - [ ] Run `npm run prisma:deploy`
   - [ ] Verify indexes are created
   - [ ] Test full-text search

3. **S3:**
   - [ ] Configure CloudFront CDN
   - [ ] Set up bucket lifecycle policies
   - [ ] Configure bucket versioning

4. **Security:**
   - [ ] Enable HTTPS
   - [ ] Configure rate limiting
   - [ ] Set up monitoring/logging
   - [ ] Implement authentication (if required)

5. **Performance:**
   - [ ] Enable Redis caching (optional)
   - [ ] Configure connection pooling
   - [ ] Set up load balancing

## 📝 Next Steps

1. **Add Authentication:**
   - Implement JWT or OAuth
   - Add authentication middleware
   - Protect create/update/delete endpoints

2. **Add Author Management:**
   - Create Author model
   - Link blogs to authors
   - Add author endpoints

3. **Implement Redis Caching:**
   - Set `REDIS_ENABLED=true`
   - Configure Redis URL
   - Test cache invalidation

4. **Add Analytics:**
   - Track popular blogs
   - Monitor search queries
   - Generate usage reports

5. **Setup Monitoring:**
   - Add logging service (e.g., Winston)
   - Configure error tracking (e.g., Sentry)
   - Set up uptime monitoring

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)

## 💡 Tips

- Use Prisma Studio for quick data inspection
- Enable Redis for production (significant performance boost)
- Monitor S3 costs and setup lifecycle policies
- Regularly backup your database
- Use environment-specific .env files (.env.development, .env.production)

---

Need help? Check the main README.md or examples/API_EXAMPLES.md for more details.
