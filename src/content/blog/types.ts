export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  author: string;
  image?: string; // OG image URL
  content: string; // Markdown content
}
