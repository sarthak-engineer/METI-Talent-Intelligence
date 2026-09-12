"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { name: string; href: string; disabled?: boolean };

export default function Navigation() {
  const pathname = usePathname();

  const links: NavLink[] = [
    { name: "Overview", href: "/" },
    { name: "Assessment", href: "/assessment" },
    { name: "Case", href: "/case" },
    { name: "Interview", href: "/interview" },
    { name: "Evidence", href: "/evidence" },
    { name: "Diagnosis", href: "/diagnosis" },
    { name: "Development", href: "/development" },
    { name: "Evolution", href: "/evolution" },
    { name: "Reports", href: "/reports" },
    { name: "Review Queue", href: "/review" },
  ];

  return (
    <nav className="nav-bar">
      <div className="nav-container">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          if (link.disabled) {
            return (
              <div key={link.name} className="nav-item disabled">
                {link.name}
              </div>
            );
          }

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
