export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  dateModified?: string; // YYYY-MM-DD
  author: string;
  image?: string; // OG image URL
  category?: string;
  tags?: string[];
  content: string; // Markdown content
}
