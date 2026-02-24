import { transformYouTubeEmbeds } from './src/utils/transformYouTubeEmbeds.js';

const html1 = `
<figure class="kg-card kg-embed-card">
  <iframe width="200" height="113" src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="video"></iframe>
  <figcaption>Rick roll</figcaption>
</figure>
`;

const html2 = `
<p>Here is a video</p>
<iframe src="https://youtu.be/dQw4w9WgXcQ" title="cool vid"></iframe>
<p>End of post</p>
`;

console.log("=== TEST 1 ===");
console.log(transformYouTubeEmbeds(html1));

console.log("\n=== TEST 2 ===");
console.log(transformYouTubeEmbeds(html2));
