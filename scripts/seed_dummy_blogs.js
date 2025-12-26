/*
Seed script to create 20 dummy blogs: creates DB entries then uploads content to S3 using blog ID.
Usage: node scripts/seed_dummy_blogs.js

This script reads AWS and DATABASE credentials from .env via require('dotenv').config();
Be careful: it will create real data in your production DB if your env points there.
*/

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const prisma = require('../src/prismaClient');
const s3Service = require('../src/services/s3Service');
const logger = require('../src/utils/logger');

const DUMMY_COUNT = 20;

const randomTags = (i) => {
  const pool = ['test', 'demo', 'seed', 'sample', 'blog', 'news', 'tech', 'life'];
  return [pool[i % pool.length], pool[(i+3) % pool.length]];
};

(async function main() {
  logger.info('Starting dummy seed: creating', DUMMY_COUNT, 'blogs');

  try {
    for (let i = 1; i <= DUMMY_COUNT; i++) {
      const title = `DUMMY Blog Post ${Date.now()}-${i}`;
      const tags = randomTags(i);
      const readTime = Math.floor(Math.random() * 10) + 1;

      // 1) Create DB record first to obtain ID (contentUrl is required by schema)
      const created = await prisma.blog.create({
        data: {
          title,
          tags,
          contentUrl: 'placeholder',
          coverImageUrl: null,
          readTime,
        },
      });

      const blogId = created.id;
      logger.info(`Created DB record for blog id=${blogId}`);

      // 2) Prepare content
      const html = `<!doctype html>\n<html><head><meta charset=\"utf-8\">\n<title>${title}</title></head>\n<body>\n<h1>${title}</h1>\n<p>This is dummy content for blog id ${blogId}.</p>\n<p>Tags: ${tags.join(', ')}</p>\n</body></html>`;
      const buffer = Buffer.from(html, 'utf8');

      // 3) Upload to S3 using existing service
      const contentUrl = await s3Service.uploadBlogContent(buffer, blogId, 'text/html');
      logger.info(`Uploaded content for blog id=${blogId} to ${contentUrl}`);

      // 4) Update DB record with contentUrl
      const updated = await prisma.blog.update({
        where: { id: blogId },
        data: { contentUrl },
      });

      logger.info(`Updated blog id=${blogId} with contentUrl`);

      // Small delay to avoid burst
      await new Promise((res) => setTimeout(res, 250));
    }

    logger.info('Dummy seed completed successfully');
  } catch (err) {
    logger.error('Seed script error:', err);
    process.exitCode = 1;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {}
  }
})();
