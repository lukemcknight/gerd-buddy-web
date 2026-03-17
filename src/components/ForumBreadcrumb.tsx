import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

const ForumBreadcrumb = ({ items }: { items: BreadcrumbItem[] }) => (
  <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
    <Link to="/" className="hover:text-primary transition-colors">Home</Link>
    {items.map((item, i) => (
      <span key={i} className="flex items-center gap-1.5">
        <ChevronRight className="w-3.5 h-3.5" />
        {item.to ? (
          <Link to={item.to} className="hover:text-primary transition-colors">{item.label}</Link>
        ) : (
          <span className="text-foreground">{item.label}</span>
        )}
      </span>
    ))}
  </nav>
);

export default ForumBreadcrumb;
