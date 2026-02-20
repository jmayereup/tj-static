import GhostContentAPI from '@tryghost/content-api';

export const ghostClient = new GhostContentAPI({
  url: import.meta.env.GHOST_API_URL,
  key: import.meta.env.GHOST_CONTENT_API_KEY,
  version: "v5.0"
});
