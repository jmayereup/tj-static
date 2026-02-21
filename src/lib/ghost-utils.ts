import { ghostClient } from './ghost';

export async function getAllPosts(options: any = {}) {
  const posts: any[] = [];
  let page = 1;
  let totalPages = 1;

  const dateFilter = "published_at:>'2025-12-01T00:00:00Z'";
  const filter = options.filter ? `(${options.filter})+${dateFilter}` : dateFilter;

  do {
    const response = await ghostClient.posts.browse({
      ...options,
      filter: filter,
      limit: 15, // Using a standard size, though Ghost might handle up to 100
      page: page,
    });
    posts.push(...response);
    totalPages = response.meta.pagination.pages;
    page++;
  } while (page <= totalPages);

  return posts;
}

export async function getAllPages(options: any = {}) {
  const pages: any[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await ghostClient.pages.browse({
      ...options,
      limit: 15,
      page: page,
    });
    pages.push(...response);
    totalPages = response.meta.pagination.pages;
    page++;
  } while (page <= totalPages);

  return pages;
}
