"use client";
import { API_BASE_URL } from "@/app/utils/api";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatScore, formatPercent, formatReadiness, formatCount } from "../utils/format";

type EvidenceDetail = {
  id: string;
  source: string;
  evidence_type: string;
  source_confidence: number;
  text: string;
  created_at: string;
  source_version: string;
};

type Evaluation = {
  competency_id: string;
  score: number;
  confidence: number;
  evidence_ids: string[];
  evidence_details?: EvidenceDetail[];
  rationale?: string;
  strengths: string[];
  gaps: string[];
  flags: string[];
};

type RoleMatch = {
  role_id: string;
  role_name: string;
  match_score: number;
  readiness_score?: number;
  readiness_status?: string;
  requirements_met?: number;
  requirements_total?: number;
  blocking_gaps?: string[];
};

type Analysis = {
  candidate_id: string;
  evaluations: Evaluation[];
  cci: number;
  evidence_coverage: number;
  evidence_confidence: number;
  role_matches: RoleMatch[];
  scoring_version: string;
  role_readiness?: any[];
  review_decision?: any;
};

const COMPETENCY_NAMES: Record<string, string> = {
  C01: "Strategy & Enterprise Thinking",
  C02: "Research & Insight",
  C03: "Value Chain & Enterprise Analysis",
  C04: "Process / Capability / TOM",
  C05: "Transformation & Change",
  C06: "Organisation / Governance",
  C07: "Programme / Portfolio / Benefits",
  C08: "Enterprise AI Transformation",
  C09: "Problem Structuring & Commercial Thinking",
  C10: "Executive Communication — Written",
  C11: "Executive Communication — Video",
  C12: "Stakeholder / Facilitation",
  C13: "Professional Judgement",
  C14: "Learning Agility / Adaptability",
};

function scoreLabel(s: number) { return s >= 80 ? "Strong" : s >= 65 ? "Developing" : "Emerging"; }
function scoreColor(s: number) { return s >= 80 ? "var(--emerald)" : s >= 65 ? "var(--blue)" : "var(--amber)"; }

const ET_BADGE: Record<string, string> = {
  resume: "mi-badge-blue",
  portfolio: "mi-badge-cyan",
  case_work_sample: "mi-badge-violet",
  consulting_response: "mi-badge-violet",
  structured_scenario: "mi-badge-amber",
  diagnostic: "mi-badge-amber",
  human_review: "mi-badge-emerald",
};

export default function DiagnosisPage() {
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

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
      await refreshState(cid);
      setLoading(false);
    }
    load();
  }, []);

  async function refreshState(cid: string) {
    try {
      const [anRes, evRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/analysis/${cid}`).catch(() => null),
        fetch(`${API_BASE_URL}/api/evidence/${cid}`).catch(() => null),
      ]);

      if (evRes && evRes.ok) {
        const evData = await evRes.json();
        setEvidenceItems(Array.isArray(evData) ? evData : evData.evidence ?? []);
      }

      if (anRes && anRes.ok) {
        const an = await anRes.json();
        setAnalysis(an);
        if (an.evaluations?.length) setSelected(an.evaluations[0].competency_id);
      } else {
        setAnalysis(null);
      }
    } catch (e: any) {
      setError(e.message || "Unable to load analysis.");
    }
  }

  const handleGenerateDiagnosis = async () => {
    if (!candidateId) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/analysis/${candidateId}`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to generate diagnosis.");
      }
      const newAnalysis = await res.json();
      setAnalysis(newAnalysis);
      if (newAnalysis.evaluations?.length) setSelected(newAnalysis.evaluations[0].competency_id);
    } catch (err: any) {
      setError(err.message || "Diagnosis generation failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedEval = useMemo(
    () => analysis?.evaluations.find((e) => e.competency_id === selected),
    [analysis, selected]
  );

  const primaryRole = analysis?.role_matches?.[0];
  const roleReadinessMap = useMemo(() => {
    const m: Record<string, any> = {};
    (analysis?.role_readiness ?? []).forEach((r: any) => { m[r.role_id] = r; });
    return m;
  }, [analysis]);

  if (loading) {
    return (
      <div className="mi-loading-screen">
        <div className="mi-loading-card">
          <div className="mi-loader" />
          <div>
            <div className="mi-loading-title">Building Diagnosis</div>
            <div className="mi-loading-sub">Evaluating evidence intelligence…</div>
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
          <div className="mi-eyebrow">DIAGNOSIS ENGINE</div>
          <h1 className="mi-page-title">Capability Diagnosis</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>⚡</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>No Active Candidate Session</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, maxWidth: 460, margin: "0 auto 20px" }}>
            No active candidate session. Complete candidate onboarding to begin your capability assessment.
          </p>
          <Link href="/onboarding" className="mi-btn mi-btn-primary">Begin Onboarding →</Link>
        </div>
      </div>
    );
  }

  // ─── NO ANALYSIS SNAPSHOT EXISTS ───
  if (!analysis) {
    const hasAssessmentEvidence = evidenceItems.some(
      (e: any) => (e.source || "").includes("diagnostic_assessment") || (e.evidence_type || "").includes("structured_scenario")
    );

    return (
      <div className="mi-page-inner" style={{ maxWidth: 680 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">DIAGNOSIS ENGINE ({candidateId})</div>
          <h1 className="mi-page-title">Capability Diagnosis</h1>
        </div>

        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>⚡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            {hasAssessmentEvidence ? "Ready to Generate Diagnosis" : "Assessment Required Before Diagnosis"}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, maxWidth: 500, margin: "0 auto 24px" }}>
            {hasAssessmentEvidence
              ? `Found ${evidenceItems.length} evidence record(s) bound to candidate ${candidateId}. Click below to synthesize evidence into deterministic capability scores.`
              : "Complete your assessment before diagnosis. A diagnostic assessment must be completed to evaluate capability scores."}
          </p>

          {error && (
            <div style={{ padding: "10px 14px", background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "var(--red)", marginBottom: 20, textAlign: "left" }}>
              {error}
            </div>
          )}

          {hasAssessmentEvidence ? (
            <button
              className="mi-btn mi-btn-primary"
              style={{ fontSize: 14, padding: "12px 32px" }}
              onClick={handleGenerateDiagnosis}
              disabled={analyzing}
            >
              {analyzing ? "Generating Diagnosis…" : "Generate Capability Diagnosis →"}
            </button>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/assessment" className="mi-btn mi-btn-primary" style={{ padding: "12px 28px" }}>
                  Take Assessment →
                </Link>
                <Link href="/onboarding" className="mi-btn mi-btn-ghost">
                  Upload Resume
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const cci = Math.round(analysis.cci);
  const coverage = Math.round(analysis.evidence_coverage * 100);
  const confidence = Math.round(analysis.evidence_confidence * 100);

  return (
    <div className="mi-page-inner">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div className="mi-eyebrow">DIAGNOSIS ENGINE</div>
          <h1 className="mi-page-title">Capability Diagnosis</h1>
          <p className="mi-page-subtitle">
            Evidence-grounded capability profile for <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{candidateId}</span>
          </p>
        </div>
        <div>
          <button className="mi-btn mi-btn-ghost" onClick={handleGenerateDiagnosis} disabled={analyzing}>
            {analyzing ? "Re-analyzing..." : "Re-analyze Profile ⟲"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "var(--red)", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Metrics Header */}
      <div className="mi-metric-grid mi-metric-grid-4" style={{ marginBottom: 20 }}>
        <div className="mi-metric" style={{ borderColor: "var(--border-blue)" }}>
          <div className="mi-metric-label">Capability Score / CCI</div>
          <div className="mi-metric-value blue">{formatScore(analysis.cci)}</div>
          <div className="mi-progress-track" style={{ marginTop: 8 }}>
            <div className="mi-progress-fill" style={{ width: `${cci}%` }} />
          </div>
          <div className="mi-metric-sub">Demonstrated capability estimate</div>
        </div>
        <div className="mi-metric">
          <div className="mi-metric-label">Evidence Coverage</div>
          <div className="mi-metric-value cyan">{formatPercent(analysis.evidence_coverage)}</div>
          <div className="mi-progress-track" style={{ marginTop: 8 }}>
            <div className="mi-progress-fill cyan" style={{ width: `${coverage}%` }} />
          </div>
          <div className="mi-metric-sub">Framework coverage supported by evidence</div>
        </div>
        <div className="mi-metric">
          <div className="mi-metric-label">Evidence Confidence</div>
          <div className="mi-metric-value emerald">{formatPercent(analysis.evidence_confidence)}</div>
          <div className="mi-progress-track" style={{ marginTop: 8 }}>
            <div className="mi-progress-fill emerald" style={{ width: `${confidence}%` }} />
          </div>
          <div className="mi-metric-sub">Confidence in the evidence-backed assessment</div>
        </div>
        <div className="mi-metric" style={{ borderColor: "var(--border-violet)" }}>
          <div className="mi-metric-label">Primary Target Role</div>
          <div className="mi-metric-value violet" style={{ fontSize: 16, paddingTop: 4 }}>
            {primaryRole?.role_name ?? "—"}
          </div>
          <div className="mi-metric-sub">Alignment: {formatPercent(primaryRole?.match_score)}</div>
        </div>
      </div>

      {/* Microcopy disclaimer */}
      <div className="mi-panel-sm" style={{ marginBottom: 20, borderColor: "rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.04)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
        <span style={{ color: "var(--violet)", fontWeight: 700 }}>Note: </span>
        Role alignment reflects weighted requirement fit. Readiness also considers evidence coverage and confidence.
        These are different measures — alignment ≠ readiness ≠ suitability.
      </div>

      {/* Role readiness */}
      {analysis.role_matches.length > 0 && (
        <div className="mi-panel" style={{ marginBottom: 20 }}>
          <div className="mi-eyebrow" style={{ marginBottom: 14 }}>ROLE INTELLIGENCE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analysis.role_matches.map((role, i) => {
              const rr = roleReadinessMap[role.role_id] || {};
              const readinessScore = role.readiness_score ?? rr.readiness_score;
              const readinessStatus = role.readiness_status ?? rr.status ?? "DEVELOPING";
              return (
                <div key={role.role_id} style={{
                  display: "grid", gridTemplateColumns: "1fr 90px 100px 90px 120px",
                  alignItems: "center", gap: 16,
                  padding: "14px 16px",
                  background: i === 0 ? "rgba(139,92,246,0.06)" : "var(--bg-elevated)",
                  border: `1px solid ${i === 0 ? "var(--border-violet)" : "var(--border)"}`,
                  borderRadius: 9,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                      {i === 0 && <span style={{ fontSize: 10, color: "var(--blue)", marginRight: 6 }}>PRIMARY</span>}
                      {role.role_name}
                    </div>
                    {rr.blocking_gaps?.length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--amber)", marginBottom: 2 }}>Gaps: {rr.blocking_gaps.join(", ")}</div>
                    )}
                    {i === 0 && analysis.review_decision && (analysis.review_decision.review_required || analysis.review_decision.status !== "pending") && (
                      <div style={{ fontSize: 11, color: analysis.review_decision.status === "pending" ? "var(--amber)" : "var(--emerald)", fontWeight: 700, marginTop: 2 }}>
                        Human Review: {analysis.review_decision.status.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--violet)" }}>{formatPercent(role.match_score)}</div>
                    <div style={{ fontSize: 9, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Alignment</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: readinessScore != null && readinessScore > 70 ? "var(--emerald)" : readinessScore != null && readinessScore > 45 ? "var(--blue)" : "var(--amber)" }}>
                      {formatReadiness(readinessScore)}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Readiness</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
                      {formatCount(rr.requirements_met)}/{formatCount(rr.requirements_total)}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Reqs Met</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`mi-badge ${readinessStatus === "READY" ? "mi-badge-emerald" : readinessStatus === "DEVELOPING" ? "mi-badge-blue" : "mi-badge-amber"}`}>
                      {readinessStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Competency + Evidence Split */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
        {/* Competency list */}
        <div className="mi-panel" style={{ padding: "16px 12px" }}>
          <div className="mi-eyebrow" style={{ marginBottom: 10, padding: "0 8px" }}>COMPETENCY MAP</div>
          <div className="competency-list">
            {analysis.evaluations.map((ev) => {
              const name = COMPETENCY_NAMES[ev.competency_id] || ev.competency_id;
              const label = scoreLabel(ev.score);
              const color = scoreColor(ev.score);
              return (
                <button
                  key={ev.competency_id}
                  className={`competency-row ${selected === ev.competency_id ? "selected" : ""}`}
                  onClick={() => setSelected(ev.competency_id)}
                >
                  <div className="competency-code">{ev.competency_id}</div>
                  <div className="competency-main">
                    <div className="competency-name">{name}</div>
                    <div className="bar-row">
                      <div className="competency-bar">
                        <span style={{ width: `${ev.score}%`, background: color }} />
                      </div>
                      <span className="confidence-text">{Math.round(ev.confidence * 100)}%</span>
                    </div>
                  </div>
                  <div className="competency-score">
                    <strong>{Math.round(ev.score)}</strong>
                    <span className={`score-${label.toLowerCase()}`}>{label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Evidence panel */}
        <div>
          {selectedEval ? (
            <div className="mi-panel-glow-blue">
              <div className="selected-title">
                <span>{selectedEval.competency_id}</span>
                <h3>{COMPETENCY_NAMES[selectedEval.competency_id] || selectedEval.competency_id}</h3>
              </div>

              <div className="evaluation-summary" style={{ marginTop: 16 }}>
                <div className="evaluation-metric">
                  <span className="section-label">Score</span>
                  <strong style={{ color: scoreColor(selectedEval.score) }}>{Math.round(selectedEval.score)}</strong>
                  <span>/100 · {scoreLabel(selectedEval.score)}</span>
                </div>
                <div className="evaluation-metric">
                  <span className="section-label">Evidence Confidence</span>
                  <strong>{Math.round(selectedEval.confidence * 100)}%</strong>
                  <span>weighted</span>
                </div>
                <div className="evaluation-metric">
                  <span className="section-label">Evidence Records</span>
                  <strong>{selectedEval.evidence_ids.length}</strong>
                  <span>items</span>
                </div>
              </div>

              {selectedEval.flags?.length > 0 && (
                <div className="evidence-warning" style={{ marginTop: 14 }}>
                  <strong>⚠ Flags</strong>
                  {selectedEval.flags.map((f, i) => <div key={i} style={{ fontSize: 11, marginTop: 2 }}>{f}</div>)}
                </div>
              )}

              {selectedEval.rationale && (
                <div className="rationale" style={{ marginTop: 14 }}>
                  <div className="quote-mark">"</div>
                  <p>{selectedEval.rationale}</p>
                </div>
              )}

              <div className="strength-gap-grid">
                <div>
                  <div className="section-label strength-label">Strengths</div>
                  {selectedEval.strengths?.length > 0
                    ? selectedEval.strengths.map((s, i) => (
                        <div key={i} className="bullet-item"><span>+</span>{s}</div>
                      ))
                    : <div style={{ fontSize: 11, color: "var(--text-faint)", fontStyle: "italic" }}>None identified</div>}
                </div>
                <div>
                  <div className="section-label gap-label">Evidence Gaps</div>
                  {selectedEval.gaps?.length > 0
                    ? selectedEval.gaps.map((g, i) => (
                        <div key={i} className="bullet-item" style={{ color: "var(--amber)" }}><span style={{ color: "var(--amber)" }}>△</span>{g}</div>
                      ))
                    : <div style={{ fontSize: 11, color: "var(--text-faint)", fontStyle: "italic" }}>None identified</div>}
                </div>
              </div>

              {selectedEval.evidence_details && selectedEval.evidence_details.length > 0 && (
                <div className="evidence-section">
                  <div className="section-label" style={{ marginBottom: 10 }}>Supporting Evidence</div>
                  {selectedEval.evidence_details.map((ev, i) => (
                    <div key={ev.id} className="evidence-card">
                      <div className="evidence-card-top">
                        <div className="evidence-number">{i + 1}</div>
                        <div className="evidence-card-title" style={{ flex: 1 }}>
                          <strong>{ev.source}</strong>
                          <span>{ev.evidence_type?.replace(/_/g, " ")}</span>
                        </div>
                        <div className="source-confidence">
                          <strong style={{ color: ev.source_confidence >= 0.8 ? "var(--emerald)" : "var(--amber)" }}>
                            {Math.round(ev.source_confidence * 100)}%
                          </strong>
                          <span>reliability</span>
                        </div>
                      </div>
                      <div className="evidence-type-row">
                        <span className={`mi-badge ${ET_BADGE[ev.evidence_type?.toLowerCase()] || "mi-badge-muted"}`}>
                          {ev.evidence_type?.replace(/_/g, " ")}
                        </span>
                      </div>
                      {ev.text && <p className="evidence-text">"{ev.text}"</p>}
                    </div>
                  ))}
                </div>
              )}

              {(!selectedEval.evidence_details || selectedEval.evidence_details.length === 0) && (
                <div className="no-evidence" style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 14, marginBottom: 6 }}>◻</div>
                  No detailed evidence records retrieved for this competency.
                  <br />
                  <span style={{ fontSize: 11 }}>Evidence gap ≠ capability failure.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mi-panel" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: "var(--text-faint)", fontSize: 13 }}>
              Select a competency to view evaluation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
