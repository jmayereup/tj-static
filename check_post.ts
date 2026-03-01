import { getAllPosts } from './src/lib/ghost-utils';
import dotenv from 'dotenv';
dotenv.config();

const posts = await getAllPosts({ filter: 'slug:pancho-y-el-camion-de-tacos', include: ['tags'] });
console.log(JSON.stringify(posts[0], null, 2));
