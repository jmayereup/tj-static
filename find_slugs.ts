import { getAllPosts } from './src/lib/ghost-utils';
async function main() {
    try {
        const posts = await getAllPosts();
        posts.forEach(p => {
            if (p.html.includes('tj-grammar-hearts')) {
                console.log('SLUG:', p.slug);
            }
        });
    } catch (e) {
        console.error(e);
    }
}
main();
