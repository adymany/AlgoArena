import type { MetadataRoute } from 'next';
import { getApiBase } from '@/lib/api';

interface Problem {
  slug: string;
  title: string;
  difficulty: string;
  acceptance?: number;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://algoarena.com';
  
  // Base routes for the application
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: `${baseUrl}/problems`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/playground`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];

  try {
    // Fetch all problems dynamically
    // getApiBase() falls back to http://localhost:9000 during SSR
    const res = await fetch(`${getApiBase()}/api/v1/problems`, {
      next: { revalidate: 3600 } // Revalidate this API response every hour
    });
    
    if (res.ok) {
      const problems: Problem[] = await res.json();
      
      const problemRoutes = problems.map((problem) => ({
        url: `${baseUrl}/problems/${problem.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

      return [...routes, ...problemRoutes];
    }
  } catch (err) {
    console.error('Failed to fetch problems for sitemap:', err);
  }

  return routes;
}
