import PocketBase from 'pocketbase';

// You will need to add this to your .env file
export const pb = new PocketBase(import.meta.env.PUBLIC_POCKETBASE_URL || 'https://blog.teacherjake.com');

// Disable auto-cancellation to avoid fetch errors during build
pb.autoCancellation(false);
