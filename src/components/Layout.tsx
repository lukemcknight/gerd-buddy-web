import { useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navLinks = [
  { to: "/blog", label: "Blog" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
];

const Layout = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="mx-auto w-full max-w-3xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group" onClick={() => setMenuOpen(false)}>
            <img
              src="/turtle.png"
              alt="GERDBuddy"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <span className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
              GERDBuddy
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-border/50 bg-white/95 backdrop-blur-md">
            <div className="mx-auto w-full max-w-3xl px-4 py-3 flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="mailto:gerdbuddy2@gmail.com"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Contact
            </a>
          </div>
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">&copy; {new Date().getFullYear()} Luke McKnight</p>
            <p>GERDBuddy is not a substitute for professional medical advice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
