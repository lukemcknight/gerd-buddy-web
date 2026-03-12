import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

const NotFound = () => {
  return (
    <div className="flex items-center justify-center py-24 bg-gradient-to-b from-primary/10 via-background to-background text-foreground">
      <SEO
        title="Page Not Found"
        description="The page you're looking for doesn't exist."
        path="/404"
        noindex
      />
      <div className="card-elevated p-8 text-center space-y-4 opacity-0 animate-fade-in max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GERDBuddy</p>
        <h1 className="text-3xl font-display font-bold">Page not found</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link to="/" className="text-primary font-semibold hover:underline">
            Home
          </Link>
          <Link to="/blog" className="text-primary font-semibold hover:underline">
            Blog
          </Link>
          <a
            href="https://apps.apple.com/us/app/gerdbuddy-gerd-food-scanner/id6756620910"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline"
          >
            Download App
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
