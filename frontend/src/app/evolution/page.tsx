"use client";
import { API_BASE_URL } from "@/app/utils/api";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Snapshot {
  snapshot_id: string;
  attempt_number: number;
  cci: number;
  evidence_confidence: number;
  evidence_coverage: number;
}

interface CompChange {
  competency_id: string;
  before_score: number | null;
  after_score: number | null;
  score_change: number | null;
  before_confidence: number | null;
  after_confidence: number | null;
}

interface RRChange {
  role_id: string;
  role_name: string;
  before_status?: string | null;
  after_status?: string | null;
  before_readiness_score?: number | null;
  after_readiness_score?: number | null;
  readiness_change?: number | null;
}

interface Evolution {
  available: boolean;
  reason?: string;
  before?: Snapshot;
  after?: Snapshot;
  changes?: {
    cci: number;
    evidence_confidence: number;
    evidence_coverage: number;
    new_evidence_count: number;
  };
  competency_changes?: CompChange[];
  role_readiness_changes?: RRChange[];
}

const COMP_NAMES: Record<string, string> = {
  C01: "Strategy & Enterprise Thinking",
  C02: "Research & Insight",
  C03: "Value Chain & Enterprise Analysis",
  C04: "Process / Capability / TOM",
  C05: "Transformation & Change",
  C06: "Organisation & Governance",
  C07: "Programme / Portfolio / Benefits",
  C08: "Enterprise AI Transformation",
  C09: "Problem Structuring & Commercial",
  C10: "Executive Communication — Written",
  C11: "Executive Communication — Video",
  C12: "Stakeholder / Facilitation",
  C13: "Professional Judgement",
  C14: "Learning Agility / Adaptability",
};

function delta(val: number | null | undefined) {
  if (val === null || val === undefined) return null;
  const v = Number(val);
  return { val: v, positive: v > 0, negative: v < 0, neutral: v === 0 };
}

export default function EvolutionPage() {
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [evolution, setEvolution] = useState<Evolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const cid = localStorage.getItem("candidate_id");
      if (!cid) {
        setCandidateId(null);
        setLoading(false);
        return;
      }

      setCandidateId(cid);
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/analysis/${cid}/evolution`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        setEvolution(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mi-loading-screen">
        <div className="mi-loading-card">
          <div className="mi-loader" />
          <div>
            <div className="mi-loading-title">Loading Evolution</div>
            <div className="mi-loading-sub">Comparing analysis snapshots…</div>
          </div>
        </div>
      </div>
    );
  }

  // ─── NO CANDIDATE PREREQUISITE GUARD ───
  if (!candidateId) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 640 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">EVOLUTION TRACKER</div>
          <h1 className="mi-page-title">Capability Evolution</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>👤</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>No Active Candidate Session</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>
            Please complete candidate onboarding first to start your capability journey.
          </p>
          <Link href="/onboarding" className="mi-btn mi-btn-primary">Begin Onboarding →</Link>
        </div>
      </div>
    );
  }

  if (!evolution?.available) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 640 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">EVOLUTION ({candidateId})</div>
          <h1 className="mi-page-title">Reassessment Evolution</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>📈</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Insufficient Snapshot History</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {evolution?.reason || "Complete a reassessment or re-analyze after adding new evidence to compare capability evolution."}
          </p>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 24 }}>
            Note: Capability evolution requires at least two AnalysisSnapshots for the same candidate.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/evidence" className="mi-btn mi-btn-ghost">Add Evidence</Link>
            <Link href="/diagnosis" className="mi-btn mi-btn-primary">View Diagnosis</Link>
          </div>
        </div>
      </div>
    );
  }

  const { before, after, changes, competency_changes, role_readiness_changes } = evolution;
  const cci = delta(changes?.cci);
  const conf = delta(changes?.evidence_confidence);
  const cov = delta(changes?.evidence_coverage);

  const deltaStyle = (d: ReturnType<typeof delta>) => {
    if (!d) return {};
    return { color: d.positive ? "var(--emerald)" : d.negative ? "var(--red)" : "var(--text-faint)" };
  };

  const deltaSign = (d: ReturnType<typeof delta>) => {
    if (!d || d.neutral) return "";
    return d.positive ? "+" : "";
  };

  return (
    <div className="mi-page-inner">
      <div className="mi-page-header">
        <div className="mi-eyebrow">EVOLUTION ({candidateId})</div>
        <h1 className="mi-page-title">Reassessment Evolution</h1>
        <p className="mi-page-subtitle">
          Baseline → current comparison across {competency_changes?.length ?? 0} competencies.
          Missing evidence is not interpreted as zero capability.
        </p>
      </div>

      {/* Snapshot comparison bar */}
      <div className="mi-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 20, alignItems: "center" }}>
          {/* Before */}
          <div>
            <div className="mi-eyebrow" style={{ marginBottom: 8 }}>BASELINE SNAPSHOT</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>
              #{before?.attempt_number} · {before?.snapshot_id?.slice(0, 12)}…
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{Math.round(before?.cci ?? 0)}</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>CCI</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{Math.round((before?.evidence_confidence ?? 0) * 100)}%</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Confidence</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{Math.round((before?.evidence_coverage ?? 0) * 100)}%</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Coverage</div>
              </div>
            </div>
          </div>

          {/* Arrow + deltas */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, color: "var(--border-strong)", marginBottom: 10 }}>→</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {cci && (
                <div style={{ fontSize: 12, fontWeight: 700, ...deltaStyle(cci) }}>
                  {deltaSign(cci)}{cci.val.toFixed(1)} CCI
                </div>
              )}
              {conf && (
                <div style={{ fontSize: 12, fontWeight: 700, ...deltaStyle(conf) }}>
                  {deltaSign(conf)}{(conf.val * 100).toFixed(1)}% conf
                </div>
              )}
              {changes?.new_evidence_count != null && (
                <div style={{ fontSize: 11, color: "var(--blue)" }}>+{changes.new_evidence_count} evidence</div>
              )}
            </div>
          </div>

          {/* After */}
          <div>
            <div className="mi-eyebrow" style={{ marginBottom: 8, color: "var(--blue)" }}>CURRENT SNAPSHOT</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>
              #{after?.attempt_number} · {after?.snapshot_id?.slice(0, 12)}…
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--blue)" }}>{Math.round(after?.cci ?? 0)}</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>CCI</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--emerald)" }}>{Math.round((after?.evidence_confidence ?? 0) * 100)}%</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Confidence</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--cyan)" }}>{Math.round((after?.evidence_coverage ?? 0) * 100)}%</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Coverage</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Competency Movement */}
      {competency_changes && competency_changes.length > 0 && (
        <div className="mi-panel" style={{ marginBottom: 20 }}>
          <div className="mi-eyebrow" style={{ marginBottom: 14 }}>COMPETENCY MOVEMENT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {competency_changes.map((c) => {
              const d = delta(c.score_change);
              if (!d) return null;
              const width = Math.min(Math.abs(c.score_change ?? 0) / 30, 1);
              return (
                <div key={c.competency_id} style={{
                  display: "grid", gridTemplateColumns: "48px 1fr 60px 60px 80px",
                  alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 8,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}>
                  <span className="mi-badge mi-badge-muted">{c.competency_id}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                      {COMP_NAMES[c.competency_id] || c.competency_id}
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden", maxWidth: 200 }}>
                      <div style={{
                        height: "100%", borderRadius: 99,
                        width: `${width * 100}%`,
                        background: d.positive ? "var(--emerald)" : d.negative ? "var(--red)" : "var(--border-strong)",
                      }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Before</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>
                      {c.before_score != null ? Math.round(c.before_score) : "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>After</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                      {c.after_score != null ? Math.round(c.after_score) : "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`mi-badge ${d.positive ? "mi-badge-emerald" : d.negative ? "mi-badge-red" : "mi-badge-muted"}`}>
                      {deltaSign(d)}{d.val.toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Role readiness changes */}
      {role_readiness_changes && role_readiness_changes.length > 0 && (
        <div className="mi-panel">
          <div className="mi-eyebrow" style={{ marginBottom: 14 }}>ROLE READINESS CHANGES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {role_readiness_changes.map((r) => {
              const rd = delta(r.readiness_change);
              return (
                <div key={r.role_id} style={{
                  display: "grid", gridTemplateColumns: "1fr 100px 100px 100px",
                  alignItems: "center", gap: 16,
                  padding: "12px 14px", borderRadius: 9,
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{r.role_name}</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 3 }}>Before</div>
                    <span className={`mi-badge ${r.before_status === "READY" ? "mi-badge-emerald" : r.before_status === "DEVELOPING" ? "mi-badge-blue" : "mi-badge-muted"}`}>
                      {r.before_status ?? "—"}
                    </span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 3 }}>After</div>
                    <span className={`mi-badge ${r.after_status === "READY" ? "mi-badge-emerald" : r.after_status === "DEVELOPING" ? "mi-badge-blue" : "mi-badge-muted"}`}>
                      {r.after_status ?? "—"}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {rd && (
                      <span className={`mi-badge ${rd.positive ? "mi-badge-emerald" : rd.negative ? "mi-badge-red" : "mi-badge-muted"}`}>
                        {deltaSign(rd)}{rd.val.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
