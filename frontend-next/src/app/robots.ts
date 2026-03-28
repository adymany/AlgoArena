import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://algoarena.com';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/profile'], // Don't index admin or private profile pages
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
