import PocketBase from 'pocketbase';

// You will need to add this to your .env file
export const pb = new PocketBase(import.meta.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Disable auto-cancellation to avoid fetch errors during build
pb.autoCancellation(false);
