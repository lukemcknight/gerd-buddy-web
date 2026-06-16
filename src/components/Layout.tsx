import { useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { Menu, X, Apple } from "lucide-react";
import UserMenu from "./UserMenu";
import { APP_STORE_URL } from "@/config/site";

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
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="mx-auto w-full max-w-screen-xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setMenuOpen(false)}>
              <img
                src="/gerdbuddy-mark.png"
                alt="GERDBuddy"
                className="w-9 h-9 object-contain transition-transform duration-300 group-hover:-rotate-6"
              />
              <span className="font-body font-extrabold tracking-tight text-lg text-foreground">
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
                    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <UserMenu />
            </div>

            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <Apple className="w-4 h-4" />
              Get the app
            </a>

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
          <div className="sm:hidden border-t border-border/60 bg-background/95 backdrop-blur-md">
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
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <Apple className="w-4 h-4" />
                Get the app
              </a>
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
      <footer className="border-t border-border/70 bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Column 1: Brand */}
            <div className="space-y-3">
              <Link to="/" className="flex items-center gap-2.5">
                <img src="/gerdbuddy-mark-light.png" alt="GERDBuddy" className="w-9 h-9 object-contain" />
                <span className="font-body font-extrabold tracking-tight text-lg">GERDBuddy</span>
              </Link>
              <p className="text-sm text-primary-foreground/70 leading-relaxed">
                Relief-first GERD tracking. Scan meals, calm flares, and find your triggers.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Explore</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Home</Link></li>
                <li><Link to="/blog" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Blog</Link></li>
                <li><Link to="/forum" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Forum</Link></li>
              </ul>
            </div>

            {/* Column 3: Legal */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Get in touch</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:gerdbuddy2@gmail.com" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                    gerdbuddy2@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    <Apple className="w-4 h-4" />
                    Download on the App Store
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-primary-foreground/15 text-center text-sm text-primary-foreground/60 space-y-1">
            <p className="font-semibold text-primary-foreground/90">&copy; {new Date().getFullYear()} Luke McKnight</p>
            <p>GERDBuddy is not a substitute for professional medical advice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
