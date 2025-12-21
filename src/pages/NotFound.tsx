import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 via-background to-background text-foreground">
      <div className="card-elevated p-8 text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GERDBuddy</p>
        <h1 className="text-3xl font-display font-bold">Page not found</h1>
        <p className="text-muted-foreground">The page you’re looking for doesn’t exist. Head back to support.</p>
        <Link to="/" className="text-primary font-semibold hover:underline">
          Return to Support
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
