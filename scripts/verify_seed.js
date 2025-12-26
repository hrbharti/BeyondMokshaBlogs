require('dotenv').config();
const prisma = require('../src/prismaClient');

(async function(){
  try{
    const total = await prisma.blog.count({ where: { deletedAt: null } });
    const sample = await prisma.blog.findMany({ where: { deletedAt: null }, orderBy: { id: 'desc' }, take: 5 });
    console.log('Total visible blogs:', total);
    console.log('Latest 5 IDs:', sample.map(b=>({id:b.id,title:b.title,contentUrl:b.contentUrl})).join('\n'));
  }catch(e){
    console.error(e);
  }finally{
    await prisma.$disconnect();
  }
})();
