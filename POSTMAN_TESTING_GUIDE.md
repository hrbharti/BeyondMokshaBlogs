# 📮 Postman Testing Guide - BeyondMoksha Blog API

## 🎯 How to View Blog Content Stored in S3

---

## 📋 **Quick Answer:**

To view blog content, you need **TWO API calls**:

1. **First Call:** Get blog metadata (includes S3 URL)
2. **Second Call:** Fetch content from S3 URL

---

## 🔧 **Step-by-Step in Postman**

### **Step 1: Get Blog Metadata**

**Request Details:**
```
Method: GET
URL: http://localhost:8000/api/blogs/understanding-death-care
```

**In Postman:**
1. Create new request
2. Set method to `GET`
3. Enter URL: `http://localhost:8000/api/blogs/understanding-death-care`
4. Click **Send**

**Response You'll Get:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Understanding Death Care Services",
    "slug": "understanding-death-care",
    "summary": "A comprehensive guide...",
    "tags": ["death-care", "funeral", "planning"],
    "contentUrl": "https://beyondmoksha.com.s3.ap-south-1.amazonaws.com/blogs/understanding-death-care/content.html",
    "coverImageUrl": null,
    "readTime": 5,
    "status": "published",
    "createdAt": "2025-11-15T07:03:37.828Z"
  }
}
```

**👉 Copy the `contentUrl` value!**

---

### **Step 2: Fetch Content from S3**

**Request Details:**
```
Method: GET
URL: [Paste the contentUrl from Step 1]
```

**In Postman:**
1. Create new request
2. Set method to `GET`
3. Paste the `contentUrl`: 
   ```
   https://beyondmoksha.com.s3.ap-south-1.amazonaws.com/blogs/understanding-death-care/content.html
   ```
4. Click **Send**

**Response You'll Get:**
```html
<!DOCTYPE html>
<html>
<body>
    <h1>Understanding Death Care Services</h1>
    <p>Death care services encompass...</p>
    <h2>Key Services Include:</h2>
    <ul>
        <li><strong>Funeral Planning:</strong> Helping families...</li>
        ...
    </ul>
</body>
</html>
```

**✅ This is your actual blog content stored in S3!**

---

## 📚 **All Available API Endpoints**

### **1. Health Check**
```
GET http://localhost:8000/health
```
**Purpose:** Check if server is running

---

### **2. List All Blogs (Paginated)**
```
GET http://localhost:8000/api/blogs
```
**Query Parameters (Optional):**
- `page=1` - Page number
- `limit=20` - Items per page
- `status=published` - Filter by status (draft/published/archived)
- `tags=death-care,funeral` - Filter by tags (comma-separated)

**Example:**
```
GET http://localhost:8000/api/blogs?page=1&limit=10&status=published
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Understanding Death Care",
      "slug": "understanding-death-care",
      "contentUrl": "https://...",
      ...
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasMore": false
  }
}
```

---

### **3. Get Single Blog by Slug**
```
GET http://localhost:8000/api/blogs/{slug}
```

**Example:**
```
GET http://localhost:8000/api/blogs/understanding-death-care
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Understanding Death Care Services",
    "contentUrl": "https://beyondmoksha.com.s3.ap-south-1.amazonaws.com/blogs/understanding-death-care/content.html",
    ...
  }
}
```

**👉 Use the `contentUrl` to fetch actual content!**

---

### **4. Create New Blog**
```
POST http://localhost:8000/api/blogs
```

**Body Type:** `form-data` (NOT raw JSON!)

**In Postman:**
1. Select `POST` method
2. Go to **Body** tab
3. Select **form-data** (NOT raw!)
4. Add these fields:

| Key | Type | Value |
|-----|------|-------|
| `title` | Text | `My Blog Title` |
| `slug` | Text | `my-blog-title` |
| `summary` | Text | `Brief description` |
| `tags` | Text | `["tag1","tag2"]` |
| `status` | Text | `published` |
| `readTime` | Text | `5` |
| `content` | **File** | Select your HTML file |
| `cover` | **File** | Select image file (optional) |

**Example Values:**
```
title: Understanding Funeral Services
slug: understanding-funeral-services
summary: A guide to modern funeral services
tags: ["funeral","planning","services"]
status: published
readTime: 7
content: [Select content.html file]
cover: [Select cover.jpg file]
```

**Response:**
```json
{
  "success": true,
  "message": "Blog created successfully",
  "data": {
    "id": 2,
    "title": "Understanding Funeral Services",
    "slug": "understanding-funeral-services",
    "contentUrl": "https://beyondmoksha.com.s3.ap-south-1.amazonaws.com/blogs/understanding-funeral-services/content.html",
    ...
  }
}
```

---

### **5. Update Blog**
```
PUT http://localhost:8000/api/blogs/{id}
```

**Body Type:** `form-data`

**Example:**
```
PUT http://localhost:8000/api/blogs/1
```

**Body (all fields optional):**
```
title: Updated Title
summary: Updated summary
tags: ["new-tag","another-tag"]
status: published
content: [New content.html file - optional]
cover: [New cover image - optional]
```

---

### **6. Soft Delete Blog**
```
DELETE http://localhost:8000/api/blogs/{id}
```

**Example:**
```
DELETE http://localhost:8000/api/blogs/1
```

**Response:**
```json
{
  "success": true,
  "message": "Blog deleted successfully"
}
```

**Note:** This is a soft delete - blog is marked deleted but not removed from database.

---

### **7. Permanent Delete Blog**
```
DELETE http://localhost:8000/api/blogs/{id}/permanent
```

**Example:**
```
DELETE http://localhost:8000/api/blogs/1/permanent
```

**Response:**
```json
{
  "success": true,
  "message": "Blog permanently deleted"
}
```

**Note:** This removes blog from database AND deletes files from S3.

---

## 🎨 **Viewing Content in Browser**

### **Option 1: Direct S3 URL**
After getting the `contentUrl`, paste it directly in your browser:
```
https://beyondmoksha.com.s3.ap-south-1.amazonaws.com/blogs/understanding-death-care/content.html
```

**Note:** This might not work if S3 bucket doesn't have public access enabled.

---

## 🔍 **Troubleshooting**

### **Problem: "Content file is required" error**

**Cause:** Not using `form-data` in Postman

**Solution:**
1. Go to Body tab
2. Select **form-data** (NOT raw, NOT x-www-form-urlencoded)
3. Add fields with correct types (Text or File)

---

### **Problem: "Tags must be a valid JSON array" error**

**Cause:** Tags not in JSON format

**Solution:**
Send tags as: `["tag1","tag2","tag3"]` (with quotes and square brackets)

---

### **Problem: "Blog not found" error**

**Cause:** Wrong slug or blog doesn't exist

**Solution:**
1. First call: `GET http://localhost:8000/api/blogs` to see all blogs
2. Copy the correct slug from the response
3. Use that slug in your request

---

### **Problem: Can't access S3 content URL**

**Cause:** S3 bucket might not have public read access

**Solution:**
Two options:
1. **Make bucket public** (for public blogs):
   - Go to AWS S3 Console
   - Select your bucket
   - Permissions → Block public access → Edit → Turn off
   - Bucket Policy → Add:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::beyondmoksha.com/blogs/*"
       }
     ]
   }
   ```

2. **Use presigned URLs** (for private content):
   - Backend generates temporary signed URLs
   - URLs expire after set time
   - More secure but complex

---

## 📝 **Quick Testing Workflow**

### **Test 1: Create a Blog**
```
1. POST http://localhost:8000/api/blogs
   - Add all required fields in form-data
   - Upload content.html file
   
2. Copy the "id" and "slug" from response
```

### **Test 2: View the Blog**
```
1. GET http://localhost:8000/api/blogs/{slug}
   - Copy the "contentUrl"
   
2. GET {contentUrl}
   - See the actual HTML content
```

### **Test 3: List All Blogs**
```
GET http://localhost:8000/api/blogs
- See all your blogs with their metadata
```

### **Test 4: Update a Blog**
```
PUT http://localhost:8000/api/blogs/{id}
- Update title, summary, or upload new content
```

### **Test 5: Delete a Blog**
```
DELETE http://localhost:8000/api/blogs/{id}
- Soft delete (can be restored)

OR

DELETE http://localhost:8000/api/blogs/{id}/permanent
- Hard delete (cannot be restored)
```

---

## 🚀 **Pro Tips**

### **Tip 1: Save Requests in Postman Collection**
1. Create a collection: "BeyondMoksha Blog API"
2. Save all requests in it
3. Add environment variables for base URL

### **Tip 2: Use Environment Variables**
```
{{BASE_URL}} = http://localhost:8000
{{API_PREFIX}} = /api

Then use: {{BASE_URL}}{{API_PREFIX}}/blogs
```

### **Tip 3: View Response as HTML**
When viewing S3 content:
1. Click **Visualize** tab in Postman response
2. You'll see rendered HTML instead of raw code

### **Tip 4: Test with Sample Content**
Create a simple HTML file for testing:
```html
<!DOCTYPE html>
<html>
<body>
    <h1>Test Blog Post</h1>
    <p>This is a test blog post for testing purposes.</p>
</body>
</html>
```
Save as `test-content.html` and upload it.

---

## ✅ **Summary**

**To view blog content:**
1. ✅ Call `GET /api/blogs/{slug}` to get metadata
2. ✅ Copy the `contentUrl` from response
3. ✅ Call `GET {contentUrl}` to fetch actual HTML content
4. ✅ View the HTML in Postman or browser

**Your backend stores:**
- 📄 HTML content → S3 bucket
- 📊 Metadata (title, tags, S3 URL) → PostgreSQL
- 🖼️ Cover images → S3 bucket

**Your frontend will:**
1. Fetch metadata from your API
2. Fetch content from S3 URL
3. Render HTML with styling

---

**Happy Testing! 🎉**
