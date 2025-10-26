import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { name: "Home", path: "/" },
    { name: "Features", path: "/features" },
    { name: "Demo", path: "/demo" },
    { name: "Pricing", path: "/pricing" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-sage">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-primary-foreground"
            >
              <path d="M 6 18 Q 12 12, 18 18" />
              <path d="M 6 12 Q 12 6, 18 12" />
            </svg>
          </div>
          <span className="text-xl font-bold text-foreground">Sage.ai</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive(link.path) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="flex items-center space-x-3 pl-4 border-l border-border/40">
            {!isLoading && user ? (
              // User is logged in - show profile circle
              <Link
                to="/settings"
                className="w-10 h-10 rounded-full bg-gradient-sage flex items-center justify-center hover:opacity-80 transition-opacity"
                title={user.fullName}
              >
                <User className="w-5 h-5 text-primary-foreground" />
              </Link>
            ) : (
              // User is not logged in - show sign in and try buttons
              <>
                <Link
                  to="/signin"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Sign In
                </Link>
                <Link to="/pricing">
                  <Button className="bg-gradient-sage hover:opacity-90 transition-opacity">
                    Try Sage.ai
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4 space-y-3">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block py-2 text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.path) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="border-t border-border/40 pt-3 space-y-3">
              {!isLoading && user ? (
                // User is logged in - show settings link
                <Link
                  to="/settings"
                  onClick={() => setIsOpen(false)}
                  className="block py-2 text-sm font-medium text-primary"
                >
                  Settings
                </Link>
              ) : (
                // User is not logged in - show sign in and try buttons
                <>
                  <Link
                    to="/signin"
                    onClick={() => setIsOpen(false)}
                    className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link to="/pricing" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-sage hover:opacity-90 transition-opacity">
                      Try Sage.ai
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
