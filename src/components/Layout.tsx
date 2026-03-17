import { useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import UserMenu from "./UserMenu";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/blog", label: "Blog" },
  { to: "/forum", label: "Forum" },
];

const Layout = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="mx-auto w-full max-w-screen-xl px-4 h-14 flex items-center justify-between">
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
                end={link.to === "/"}
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

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <UserMenu />
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
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-border/50 bg-white/95 backdrop-blur-md">
            <div className="mx-auto w-full max-w-screen-xl px-4 py-3 flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
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
              <div className="px-3 py-2">
                <UserMenu />
              </div>
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
        <div className="mx-auto w-full max-w-screen-xl px-4 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Column 1: Brand */}
            <div className="space-y-3">
              <Link to="/" className="flex items-center gap-2">
                <img src="/turtle.png" alt="GERDBuddy" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-display font-bold text-foreground">GERDBuddy</span>
              </Link>
              <p className="text-sm text-muted-foreground">Your all-in-one GERD resource</p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
                <li><Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors">Blog</Link></li>
                <li><Link to="/forum" className="text-muted-foreground hover:text-primary transition-colors">Forum</Link></li>
              </ul>
            </div>

            {/* Column 3: Legal */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:gerdbuddy2@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">
                    gerdbuddy2@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://apps.apple.com/us/app/gerdbuddy-acid-reflux-tracker/id6740261875"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Download on the App Store
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-8 pt-6 border-t border-border/50 text-center text-sm text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">&copy; {new Date().getFullYear()} Luke McKnight</p>
            <p>GERDBuddy is not a substitute for professional medical advice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
