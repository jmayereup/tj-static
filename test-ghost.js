import 'dotenv/config';
import { getAllPosts } from './src/lib/ghost-utils.js';

async function run() {
  const posts = await getAllPosts({ filter: 'slug:th-sound' });
  if (posts.length > 0) {
    console.log(posts[0].html);
  }
}
run();
