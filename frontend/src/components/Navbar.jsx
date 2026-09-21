import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home" },
  { to: "/live", label: "Live Monitor" },
  { to: "/blacklist", label: "Blacklist" },
  { to: "/#how-it-works", label: "How It Works" },
  { to: "/#about", label: "About System" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent/20 border border-accent/40 text-accent">
            ⛨
          </span>
          Smart E-Fining System
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">
          {links.map((l) => (
            <NavLink key={l.label} to={l.to} className="hover:text-white transition-colors">
              {l.label}
            </NavLink>
          ))}
        </div>

        <Link
          to="/blacklist"
          className="hidden md:inline-flex bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          Check / Pay Fine
        </Link>

        <button
          className="md:hidden text-2xl"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          ☰
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-3 text-sm">
          {links.map((l) => (
            <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="text-gray-300">
              {l.label}
            </Link>
          ))}
          <Link
            to="/blacklist"
            onClick={() => setOpen(false)}
            className="bg-accent text-white text-center font-medium px-4 py-2 rounded-md"
          >
            Check / Pay Fine
          </Link>
        </div>
      )}
    </header>
  );
}
