"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SECTIONS = [
  {
    label: "CANDIDATE JOURNEY",
    items: [
      { name: "Overview",    href: "/" },
      { name: "Profile",     href: "/onboarding" },
      { name: "Resume",      href: "/resume" },
      { name: "Assessment",  href: "/assessment" },
      { name: "Case",        href: "/case" },
      { name: "Interview",   href: "/interview" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { name: "Evidence",    href: "/evidence" },
      { name: "Diagnosis",   href: "/diagnosis" },
      { name: "Development", href: "/development" },
      { name: "Evolution",   href: "/evolution" },
    ],
  },
  {
    label: "DELIVERABLES",
    items: [
      { name: "Reports",     href: "/reports" },
    ],
  },
  {
    label: "GOVERNANCE",
    items: [
      { name: "Review Queue", href: "/review" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  useEffect(() => {
    const cid = localStorage.getItem("candidate_id");
    const cname = localStorage.getItem("candidate_name");
    setCandidateId(cid);
    setCandidateName(cname);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const displayId = candidateId ? candidateId.toUpperCase().replace(/^CAND-/, "METI-") : null;

  return (
    <aside className="mi-sidebar">
      {/* Logo */}
      <div className="mi-sidebar-logo">
        <div className="mi-sidebar-mark">M</div>
        <div className="mi-sidebar-brand">
          <div className="mi-sidebar-name">METI</div>
          <div className="mi-sidebar-sub">Enterprise Talent Intelligence</div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {SECTIONS.map((section) => (
          <div key={section.label} className="mi-sidebar-section">
            <div className="mi-sidebar-section-label">{section.label}</div>
            <nav className="mi-sidebar-nav">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mi-sidebar-link ${isActive(item.href) ? "active" : ""}`}
                >
                  <span className="mi-nav-dot" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer status */}
      <div className="mi-sidebar-footer">
        {candidateId ? (
          <div className="mi-sidebar-status">
            <div className="mi-status-dot" />
            <div className="mi-status-text">
              <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 11, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {candidateName || candidateId}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", marginTop: 1 }}>
                {displayId}
              </div>
            </div>
          </div>
        ) : (
          <Link href="/onboarding" className="mi-sidebar-status" style={{ cursor: "pointer", textDecoration: "none" }}>
            <div className="mi-status-dot" style={{ background: "var(--amber)", boxShadow: "none" }} />
            <div className="mi-status-text">
              <div style={{ fontWeight: 600, color: "var(--amber)", fontSize: 11 }}>Visitor Session</div>
              <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>Begin Onboarding →</div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
