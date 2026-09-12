"use client";
import { API_BASE_URL } from "@/app/utils/api";

import { useEffect, useState } from "react";

interface ReviewQueueItem {
  candidate_id: string;
  analysis_snapshot_id: string;
  status: string;
  reasons: string[];
  created_at: string;
  cci: number;
  evidence_confidence: number;
}

interface ReviewDecision {
  id: string;
  candidate_id: string;
  analysis_snapshot_id: string;
  review_required: boolean;
  reasons: string[];
  status: string;
  reviewer_id?: string;
  reviewer_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

interface CompetencyEvaluation {
  competency_id: string;
  score: number;
  confidence: number;
  evidence_ids: string[];
  rationale: string;
  strengths: string[];
  gaps: string[];
  flags: string[];
}

interface AnalysisSnapshot {
  id: string;
  candidate_id: string;
  cci: number;
  evidence_coverage: number;
  evidence_confidence: number;
  evaluations: CompetencyEvaluation[];
  role_matches: any[];
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

export default function ReviewPage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ review: ReviewDecision; snapshot: AnalysisSnapshot } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { score?: number; confidence?: number; rationale?: string }>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const reviewerId = "Assessor-01";

  useEffect(() => { fetchQueue(); }, []);

  async function fetchQueue() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/review/queue`);
      if (!res.ok) throw new Error("Failed to load queue");
      const rawQueue = await res.json();
      const validQueue = (Array.isArray(rawQueue) ? rawQueue : []).filter((item: ReviewQueueItem) => {
        if (!item.candidate_id || !item.analysis_snapshot_id) return false;
        // Do not display zero-value broken records created by old QA runs
        if ((item.cci ?? 0) === 0 && (item.evidence_confidence ?? 0) === 0) return false;
        // Exclude test/QA candidate IDs from default review queue
        if (item.candidate_id.toLowerCase().startsWith("qa-candidate")) return false;
        return true;
      });
      setQueue(validQueue);
    } catch {
      setError("Unable to load review queue.");
    } finally {
      setLoading(false);
    }
  }

  async function selectCandidate(cid: string, sid?: string) {
    setLoading(true);
    setSelectedId(cid);
    setSuccessMsg("");
    setError("");
    try {
      const url = `${API_BASE_URL}/api/review/${cid}${sid ? `?snapshot_id=${sid}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to load review detail");
      }
      const data = await res.json();
      if (data.review?.candidate_id !== data.snapshot?.candidate_id) {
        throw new Error(`Data integrity error: Review candidate_id (${data.review?.candidate_id}) does not match AnalysisSnapshot candidate_id (${data.snapshot?.candidate_id}).`);
      }
      setDetail(data);
      setOverrides({});
      setNotes("");
    } catch (err: any) {
      setError(err.message || "Unable to load candidate review data.");
    } finally {
      setLoading(false);
    }
  }

  async function submitDecision(decision: "APPROVE" | "ADJUST" | "REQUEST_MORE_EVIDENCE") {
    if (!detail) return;
    if ((decision === "ADJUST" || decision === "REQUEST_MORE_EVIDENCE") && !notes.trim()) {
      setError("Reviewer notes are required for this action.");
      return;
    }
    const adjustments = decision === "ADJUST"
      ? Object.entries(overrides)
          .filter(([, v]) => v.score !== undefined || v.confidence !== undefined || v.rationale)
          .map(([competency_id, v]) => ({ competency_id, ...v }))
      : [];
    if (decision === "ADJUST" && adjustments.length === 0) {
      setError("You selected ADJUST but made no changes.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/review/${detail.review.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reviewer_id: reviewerId, reviewer_notes: notes, adjustments }),
      });
      if (!res.ok) throw new Error("Failed to submit decision");
      setSuccessMsg(`Decision recorded: ${decision}`);
      fetchQueue();
      setSelectedId(null);
      setDetail(null);
    } catch {
      setError("Failed to submit decision.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── LOADING ──
  if (loading && !detail) {
    return (
      <div className="mi-loading-screen">
        <div className="mi-loading-card">
          <div className="mi-loader" />
          <div>
            <div className="mi-loading-title">Loading Review Queue</div>
            <div className="mi-loading-sub">Fetching governance data…</div>
          </div>
        </div>
      </div>
    );
  }

  // ── DETAIL VIEW ──
  if (selectedId && detail) {
    const { review, snapshot } = detail;
    return (
      <div className="mi-page-inner">
        <div style={{ marginBottom: 20 }}>
          <button className="mi-btn mi-btn-ghost" style={{ marginBottom: 16 }} onClick={() => { setSelectedId(null); setDetail(null); }}>
            ← Back to Queue
          </button>
          <div className="mi-eyebrow">ASSESSOR REVIEW</div>
          <h1 className="mi-page-title">{review.candidate_id}</h1>
          <p className="mi-page-subtitle">
            Snapshot <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{review.analysis_snapshot_id?.slice(0, 16)}…</span>
          </p>
        </div>

        {successMsg && (
          <div style={{ padding: "12px 16px", marginBottom: 16, background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, color: "var(--emerald)", fontSize: 13, fontWeight: 600 }}>
            ✓ {successMsg}
          </div>
        )}
        {error && (
          <div style={{ padding: "12px 16px", marginBottom: 16, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "var(--red)", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="mi-metric-grid mi-metric-grid-3" style={{ marginBottom: 20 }}>
          <div className="mi-metric" style={{ borderColor: "var(--border-blue)" }}>
            <div className="mi-metric-label">CCI</div>
            <div className="mi-metric-value blue">{Math.round(snapshot.cci)}</div>
            <div className="mi-metric-sub">Composite Capability Index</div>
          </div>
          <div className="mi-metric">
            <div className="mi-metric-label">Evidence Confidence</div>
            <div className="mi-metric-value emerald">{Math.round(snapshot.evidence_confidence * 100)}%</div>
            <div className="mi-metric-sub">Confidence in the evidence-backed assessment</div>
          </div>
          <div className="mi-metric">
            <div className="mi-metric-label">Coverage</div>
            <div className="mi-metric-value cyan">{Math.round(snapshot.evidence_coverage * 100)}%</div>
            <div className="mi-metric-sub">Competencies with evidence</div>
          </div>
        </div>

        {/* Review reasons */}
        <div className="mi-panel" style={{ marginBottom: 20 }}>
          <div className="mi-eyebrow" style={{ marginBottom: 10 }}>REVIEW TRIGGERS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {review.reasons.map((r, i) => (
              <span key={i} className="mi-badge mi-badge-amber">{r}</span>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border-violet)" }}>
            <div style={{ fontSize: 10, color: "var(--violet)", fontWeight: 700, marginBottom: 4 }}>AI-GENERATED ANALYSIS — Requires human validation</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              The following evaluations were produced by the METI evidence pipeline. Human review validates, adjusts, or flags for additional evidence.
            </div>
          </div>
        </div>

        {/* Competency evaluations */}
        <div className="mi-panel" style={{ marginBottom: 20 }}>
          <div className="mi-eyebrow" style={{ marginBottom: 14 }}>COMPETENCY EVALUATIONS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {snapshot.evaluations.map((ev) => {
              const ov = overrides[ev.competency_id] || {};
              const hasOverride = ov.score !== undefined || ov.confidence !== undefined || ov.rationale;
              return (
                <div key={ev.competency_id} style={{
                  padding: "14px", borderRadius: 9,
                  background: "var(--bg-elevated)",
                  border: hasOverride ? "1px solid var(--border-blue)" : "1px solid var(--border)",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* AI evaluation */}
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <span className="mi-badge mi-badge-muted">{ev.competency_id}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                          {COMP_NAMES[ev.competency_id] || ev.competency_id}
                        </span>
                        <span className="mi-badge mi-badge-violet" style={{ marginLeft: "auto" }}>AI</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text-faint)" }}>Score</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{Math.round(ev.score)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text-faint)" }}>Confidence</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--emerald)" }}>{Math.round(ev.confidence * 100)}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text-faint)" }}>Evidence</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--blue)" }}>{ev.evidence_ids.length}</div>
                        </div>
                      </div>
                      {ev.rationale && (
                        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{ev.rationale}"</p>
                      )}
                      {ev.flags?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {ev.flags.map((f, i) => (
                            <div key={i} style={{ fontSize: 11, color: "var(--amber)", marginTop: 2 }}>⚠ {f}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assessor override */}
                    <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 16 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)" }}>ASSESSOR OVERRIDE</span>
                        {hasOverride && <span className="mi-badge mi-badge-blue">Modified</span>}
                      </div>
                      <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4 }}>Score (0–100)</div>
                          <input
                            type="number" min={0} max={100}
                            className="mi-input"
                            style={{ width: 80 }}
                            placeholder={String(Math.round(ev.score))}
                            value={ov.score ?? ""}
                            onChange={(e) => setOverrides((p) => ({ ...p, [ev.competency_id]: { ...p[ev.competency_id], score: e.target.value ? Number(e.target.value) : undefined } }))}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4 }}>Confidence (0–1)</div>
                          <input
                            type="number" min={0} max={1} step={0.05}
                            className="mi-input"
                            style={{ width: 80 }}
                            placeholder={ev.confidence.toFixed(2)}
                            value={ov.confidence ?? ""}
                            onChange={(e) => setOverrides((p) => ({ ...p, [ev.competency_id]: { ...p[ev.competency_id], confidence: e.target.value ? Number(e.target.value) : undefined } }))}
                          />
                        </div>
                      </div>
                      <textarea
                        className="mi-textarea"
                        rows={3}
                        placeholder="Assessor rationale (optional)…"
                        value={ov.rationale ?? ""}
                        onChange={(e) => setOverrides((p) => ({ ...p, [ev.competency_id]: { ...p[ev.competency_id], rationale: e.target.value } }))}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviewer notes + decision */}
        <div className="mi-panel">
          <div className="mi-eyebrow" style={{ marginBottom: 12 }}>REVIEWER NOTES</div>
          <textarea
            className="mi-textarea"
            rows={4}
            placeholder="Overall assessment notes, context, or rationale for your decision…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="mi-btn mi-btn-success" onClick={() => submitDecision("APPROVE")} disabled={submitting}>
              ✓ Approve
            </button>
            <button className="mi-btn mi-btn-ghost" onClick={() => submitDecision("ADJUST")} disabled={submitting}>
              ✎ Commit Adjustments
            </button>
            <button className="mi-btn mi-btn-ghost" onClick={() => submitDecision("REQUEST_MORE_EVIDENCE")} disabled={submitting}>
              ⟲ Request More Evidence
            </button>
          </div>
          <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 11, color: "var(--text-faint)" }}>
            Audit trail: Original AI evaluation → Reviewer decision → Reviewed snapshot. All decisions are immutable.
          </div>
        </div>
      </div>
    );
  }

  // ── QUEUE VIEW ──
  return (
    <div className="mi-page-inner">
      <div className="mi-page-header">
        <div className="mi-eyebrow">GOVERNANCE</div>
        <h1 className="mi-page-title">Assessor Review Queue</h1>
        <p className="mi-page-subtitle">
          Client-facing readiness recommendations require human review.
        </p>
      </div>

      {successMsg && (
        <div style={{ padding: "12px 16px", marginBottom: 16, background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, color: "var(--emerald)", fontSize: 13, fontWeight: 600 }}>
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div style={{ padding: "12px 16px", marginBottom: 16, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "var(--red)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Queue Empty</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No reviews currently require attention.</p>
        </div>
      ) : (
        <div className="mi-panel" style={{ padding: 0, overflow: "hidden" }}>
          <table className="mi-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>CCI</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Triggers</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={`${item.candidate_id}-${item.analysis_snapshot_id}`}>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.candidate_id}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--blue)", fontWeight: 700 }}>{Math.round(item.cci)}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{Math.round(item.evidence_confidence * 100)}%</td>
                  <td>
                    <span className={`mi-badge ${item.status === "pending" ? "mi-badge-amber" : item.status === "reviewed" ? "mi-badge-emerald" : "mi-badge-muted"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {item.reasons.slice(0, 2).map((r, i) => (
                        <span key={i} className="mi-badge mi-badge-amber" style={{ fontSize: 9 }}>{r}</span>
                      ))}
                      {item.reasons.length > 2 && <span className="mi-badge mi-badge-muted">+{item.reasons.length - 2}</span>}
                    </div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button className="mi-btn mi-btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => selectCandidate(item.candidate_id, item.analysis_snapshot_id)}>
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
