# Example: Creating a Blog Post

## Using curl

```bash
curl -X POST http://localhost:5000/api/blogs \
  -H "Content-Type: multipart/form-data" \
  -F "title=Understanding Death Care" \
  -F "slug=understanding-death-care" \
  -F "summary=A comprehensive guide to death care services and planning" \
  -F 'tags=["death-care","planning","funeral","guide"]' \
  -F "status=published" \
  -F "readTime=8" \
  -F "authorId=1" \
  -F "content=@./path/to/your-content.html;type=text/html" \
  -F "cover=@./path/to/your-cover.jpg;type=image/jpeg"
```

## Using JavaScript/Axios

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const createBlog = async () => {
  const form = new FormData();
  
  // Add metadata
  form.append('title', 'Understanding Death Care');
  form.append('slug', 'understanding-death-care');
  form.append('summary', 'A comprehensive guide to death care services and planning');
  form.append('tags', JSON.stringify(['death-care', 'planning', 'funeral', 'guide']));
  form.append('status', 'published');
  form.append('readTime', '8');
  form.append('authorId', '1');
  
  // Add files
  form.append('content', fs.createReadStream('./path/to/your-content.html'), {
    contentType: 'text/html',
    filename: 'content.html'
  });
  
  form.append('cover', fs.createReadStream('./path/to/your-cover.jpg'), {
    contentType: 'image/jpeg',
    filename: 'cover.jpg'
  });
  
  try {
    const response = await axios.post('http://localhost:5000/api/blogs', form, {
      headers: form.getHeaders()
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

createBlog();
```

## Fetching Blogs

### Get all published blogs (paginated)
```bash
curl http://localhost:5000/api/blogs?page=1&limit=20&status=published
```

### Get blogs by tags
```bash
curl "http://localhost:5000/api/blogs?tags=death-care,planning&status=published"
```

### Get single blog by slug
```bash
curl http://localhost:5000/api/blogs/understanding-death-care
```

### Search blogs
```bash
curl "http://localhost:5000/api/search?query=funeral+planning&limit=10"
```

## Updating a Blog

```bash
curl -X PUT http://localhost:5000/api/blogs/1 \
  -H "Content-Type: multipart/form-data" \
  -F "title=Understanding Death Care - Updated" \
  -F "status=published" \
  -F "views=150" \
  -F "likes=25"
```

## Deleting a Blog (Soft Delete)

```bash
curl -X DELETE http://localhost:5000/api/blogs/1
```

## Response Examples

### Success Response (List)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Understanding Death Care",
      "slug": "understanding-death-care",
      "authorId": 1,
      "summary": "A comprehensive guide to death care services and planning",
      "tags": ["death-care", "planning", "funeral", "guide"],
      "contentUrl": "https://cdn.example.com/blogs/understanding-death-care/content.html",
      "coverImageUrl": "https://cdn.example.com/blogs/understanding-death-care/cover.jpg",
      "readTime": 8,
      "views": 142,
      "likes": 23,
      "status": "published",
      "createdAt": "2025-01-10T10:00:00.000Z",
      "updatedAt": "2025-01-11T15:30:00.000Z"
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

### Error Response
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
