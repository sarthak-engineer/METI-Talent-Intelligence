"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface EvidenceItem {
  id: string;
  source: string;
  evidence_type: string;
  text: string;
  competency_ids: string[];
  confidence: number;
  created_at: string;
  question_id?: string;
  attempt_id?: string;
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
  cci: number;
  evidence_coverage: number;
  evidence_confidence: number;
  evaluations: CompetencyEvaluation[];
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

const TYPE_BADGE: Record<string, string> = {
  resume:               "mi-badge-blue",
  portfolio:            "mi-badge-cyan",
  case_work_sample:     "mi-badge-violet",
  consulting_response:  "mi-badge-violet",
  structured_scenario:  "mi-badge-amber",
  diagnostic:           "mi-badge-amber",
  human_review:         "mi-badge-emerald",
};

const TYPE_COLOR: Record<string, string> = {
  resume: "var(--blue)",
  portfolio: "var(--cyan)",
  case_work_sample: "var(--violet)",
  consulting_response: "var(--violet)",
  structured_scenario: "var(--amber)",
  diagnostic: "var(--amber)",
  human_review: "var(--emerald)",
};

export default function EvidencePage() {
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [records, setRecords] = useState<EvidenceItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisSnapshot | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [compFilter, setCompFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState("");

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadType, setUploadType] = useState("portfolio");
  const [uploading, setUploading] = useState(false);

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
      await refreshData(cid);
      setLoading(false);
    }
    load();
  }, []);

  async function refreshData(cid: string) {
    try {
      const [evRes, anRes, wtRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/evidence/${cid}`),
        fetch(`http://127.0.0.1:8000/api/analysis/${cid}`),
        fetch(`http://127.0.0.1:8000/api/evidence/config/weights`),
      ]);
      if (evRes.ok) {
        const evData = await evRes.json();
        setRecords(Array.isArray(evData) ? evData : (evData.evidence ?? evData.items ?? []));
      }
      if (anRes.ok) setAnalysis(await anRes.json());
      if (wtRes.ok) setWeights(await wtRes.json());
    } catch (e: any) {
      setError(e.message);
    }
  }

  const handleReanalyze = async () => {
    if (!candidateId) return;
    setAnalyzing(true);
    setAnalyzeMsg("");
    setError("");
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/analysis/${candidateId}`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Analysis generation failed");
      }
      const newSnapshot = await res.json();
      setAnalysis(newSnapshot);
      setAnalyzeMsg("✓ New immutable AnalysisSnapshot created successfully!");
      await refreshData(candidateId);
    } catch (err: any) {
      setError(err.message || "Failed to generate diagnosis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!candidateId || !uploadText.trim()) return;
    setUploading(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          source: `User Addition (${uploadType})`,
          evidence_type: uploadType,
          text: uploadText.trim(),
          confidence: 0.8,
          competency_ids: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to add evidence item");
      setShowUpload(false);
      setUploadText("");
      await refreshData(candidateId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const safeRecords = useMemo(() => (Array.isArray(records) ? records : []), [records]);

  const evidenceTypes = useMemo(() => ["All", ...Array.from(new Set(safeRecords.map((r) => r.evidence_type).filter(Boolean)))], [safeRecords]);
  const competencies = useMemo(() => ["All", ...Array.from(new Set(safeRecords.flatMap((r) => r.competency_ids || [])))].sort(), [safeRecords]);

  const filtered = useMemo(() =>
    safeRecords.filter((r) =>
      (typeFilter === "All" || r.evidence_type === typeFilter) &&
      (compFilter === "All" || (r.competency_ids || []).includes(compFilter))
    ), [safeRecords, typeFilter, compFilter]);

  const evalMap = useMemo(() => {
    const m: Record<string, CompetencyEvaluation> = {};
    (analysis?.evaluations ?? []).forEach((e) => { m[e.competency_id] = e; });
    return m;
  }, [analysis]);

  const totalEvidence = safeRecords.length;
  const uniqueComps = Math.min(new Set(safeRecords.flatMap((r) => r.competency_ids || [])).size, 14);
  const avgConfidence = safeRecords.length > 0
    ? Math.round((safeRecords.reduce((s, r) => s + (r.confidence || 0), 0) / safeRecords.length) * 100)
    : 0;

  const inconsistencies = useMemo(() => {
    const issues: { id: string; comp: string; compName: string; msg: string }[] = [];
    (analysis?.evaluations ?? []).forEach((ev) => {
      if (ev.flags?.length > 0) {
        ev.flags.forEach((f) => {
          issues.push({ id: ev.competency_id + f, comp: ev.competency_id, compName: COMP_NAMES[ev.competency_id] || ev.competency_id, msg: f });
        });
      }
    });
    return issues;
  }, [analysis]);

  if (loading) {
    return (
      <div className="mi-loading-screen">
        <div className="mi-loading-card">
          <div className="mi-loader" />
          <div>
            <div className="mi-loading-title">Loading Evidence</div>
            <div className="mi-loading-sub">Retrieving evidence records…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!candidateId) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 640 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">EVIDENCE EXPLORER</div>
          <h1 className="mi-page-title">Evidence Intelligence</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>No Active Candidate Session</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>
            Please complete candidate onboarding to upload resume evidence and start your capability assessment.
          </p>
          <Link href="/onboarding" className="mi-btn mi-btn-primary">Begin Onboarding →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mi-page-inner">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div className="mi-eyebrow">EVIDENCE EXPLORER</div>
          <h1 className="mi-page-title">Evidence Intelligence</h1>
          <p className="mi-page-subtitle">
            Claim → Evidence → Competency → Evaluation chain for <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{candidateId}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="mi-btn mi-btn-ghost" onClick={() => setShowUpload(!showUpload)}>
            + Add Evidence
          </button>
          <button className="mi-btn mi-btn-primary" onClick={handleReanalyze} disabled={analyzing || totalEvidence === 0}>
            {analyzing ? "Analyzing..." : "Re-analyze Profile"}
          </button>
        </div>
      </div>

      {analyzeMsg && (
        <div style={{ padding: "10px 14px", background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, color: "var(--emerald)", fontSize: 13, marginBottom: 16 }}>
          {analyzeMsg}
        </div>
      )}
      {error && (
        <div style={{ padding: "10px 14px", background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "var(--red)", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Manual evidence upload form */}
      {showUpload && (
        <div className="mi-panel-glow-blue" style={{ marginBottom: 20 }}>
          <div className="mi-eyebrow" style={{ marginBottom: 10, color: "var(--blue)" }}>ADD EVIDENCE ITEM</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="mi-eyebrow" style={{ display: "block", marginBottom: 4 }}>Evidence Type</label>
              <select className="mi-select" style={{ width: "100%" }} value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                <option value="portfolio">Portfolio Artifact</option>
                <option value="resume">Resume Segment</option>
                <option value="case_work_sample">Case Work Sample</option>
                <option value="consulting_response">Consulting Response</option>
              </select>
            </div>
            <div>
              <label className="mi-eyebrow" style={{ display: "block", marginBottom: 4 }}>Evidence Content / Claim Text</label>
              <input
                type="text"
                className="mi-input"
                placeholder="e.g. Delivered enterprise AI transformation roadmap for retail bank..."
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="mi-btn mi-btn-ghost" onClick={() => setShowUpload(false)}>Cancel</button>
            <button className="mi-btn mi-btn-primary" onClick={handleAddEvidence} disabled={uploading || !uploadText.trim()}>
              {uploading ? "Adding..." : "Save Evidence"}
            </button>
          </div>
        </div>
      )}

      {/* Coverage metrics */}
      <div className="mi-metric-grid mi-metric-grid-4" style={{ marginBottom: 20 }}>
        <div className="mi-metric" style={{ borderColor: "var(--border-blue)" }}>
          <div className="mi-metric-label">Evidence Records</div>
          <div className="mi-metric-value blue">{totalEvidence}</div>
          <div className="mi-metric-sub">Total evidence items</div>
        </div>
        <div className="mi-metric">
          <div className="mi-metric-label">Competencies Covered</div>
          <div className="mi-metric-value cyan">{uniqueComps}</div>
          <div className="mi-progress-track">
            <div className="mi-progress-fill cyan" style={{ width: `${(uniqueComps / 14) * 100}%` }} />
          </div>
          <div className="mi-metric-sub">of 14 framework competencies</div>
        </div>
        <div className="mi-metric">
          <div className="mi-metric-label">Evidence Confidence</div>
          <div className="mi-metric-value emerald">{analysis?.evidence_confidence !== undefined ? `${Math.round(analysis.evidence_confidence * 100)}%` : "—"}</div>
          <div className="mi-progress-track" style={{ marginTop: 10 }}>
            <div className="mi-progress-fill emerald" style={{ width: `${Math.round((analysis?.evidence_confidence || 0) * 100)}%` }} />
          </div>
          <div className="mi-metric-sub">Confidence in the evidence-backed assessment</div>
        </div>
        <div className="mi-metric">
          <div className="mi-metric-label">Analysis CCI</div>
          <div className="mi-metric-value violet">{analysis ? Math.round(analysis.cci) : "—"}</div>
          <div className="mi-metric-sub">Composite Capability Index</div>
        </div>
      </div>

      {/* Inconsistencies */}
      {inconsistencies.length > 0 && (
        <div className="mi-panel" style={{ marginBottom: 20, borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ color: "var(--amber)", fontSize: 14 }}>⚠</span>
            <div className="mi-eyebrow" style={{ color: "var(--amber)", margin: 0 }}>EVIDENCE FLAGS</div>
            <span className="mi-badge mi-badge-amber">{inconsistencies.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {inconsistencies.map((inc) => (
              <div key={inc.id} style={{
                padding: "10px 12px", borderRadius: 8,
                background: "var(--bg-elevated)", border: "1px solid rgba(245,158,11,0.2)",
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <span className="mi-badge mi-badge-blue" style={{ flexShrink: 0 }}>{inc.comp}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>{inc.compName}</div>
                  <div style={{ fontSize: 12, color: "var(--amber)" }}>{inc.msg}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence chain — Triangulation Matrix */}
      {analysis && analysis.evaluations.length > 0 && (
        <div className="mi-panel" style={{ marginBottom: 20 }}>
          <div className="mi-eyebrow" style={{ marginBottom: 14 }}>TRIANGULATION MATRIX</div>
          <div style={{ overflowX: "auto" }}>
            <table className="mi-table">
              <thead>
                <tr>
                  <th>Competency</th>
                  <th>Score</th>
                  <th>Confidence</th>
                  <th>Evidence Count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {analysis.evaluations.map((ev) => {
                  const label = ev.score >= 80 ? "Strong" : ev.score >= 65 ? "Developing" : "Emerging";
                  const badge = ev.score >= 80 ? "mi-badge-emerald" : ev.score >= 65 ? "mi-badge-blue" : "mi-badge-amber";
                  return (
                    <tr key={ev.competency_id}>
                      <td>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span className="mi-badge mi-badge-muted">{ev.competency_id}</span>
                          <span style={{ fontSize: 12 }}>{COMP_NAMES[ev.competency_id] || ev.competency_id}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 99,
                              width: `${ev.score}%`,
                              background: ev.score >= 80 ? "var(--emerald)" : ev.score >= 65 ? "var(--blue)" : "var(--amber)",
                            }} />
                          </div>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>{Math.round(ev.score)}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{Math.round(ev.confidence * 100)}%</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{ev.evidence_ids.length}</td>
                      <td><span className={`mi-badge ${badge}`}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div className="mi-eyebrow" style={{ margin: 0 }}>FILTER:</div>
        <select className="mi-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {evidenceTypes.map((t) => <option key={t} value={t}>{t === "All" ? "All Types" : t.replace(/_/g, " ")}</option>)}
        </select>
        <select className="mi-select" value={compFilter} onChange={(e) => setCompFilter(e.target.value)}>
          {competencies.map((c) => <option key={c} value={c}>{c === "All" ? "All Competencies" : `${c} — ${COMP_NAMES[c] || c}`}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "var(--text-faint)", marginLeft: "auto" }}>
          {filtered.length} / {records.length} records
        </span>
      </div>

      {/* Evidence cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <div className="mi-panel" style={{ textAlign: "center", color: "var(--text-faint)", padding: 40 }}>
            No evidence records match the selected filters.
          </div>
        )}
        {filtered.map((ev) => {
          const typeLower = (ev.evidence_type || "").toLowerCase();
          const badgeClass = TYPE_BADGE[typeLower] || "mi-badge-muted";
          const isExpanded = expanded === ev.id;
          return (
            <div key={ev.id} className="mi-panel" style={{ padding: 0, overflow: "hidden" }}>
              <button
                onClick={() => setExpanded(isExpanded ? null : ev.id)}
                style={{
                  width: "100%", textAlign: "left", background: "none", border: "none",
                  padding: "14px 16px", cursor: "pointer",
                  display: "grid", gridTemplateColumns: "1fr auto auto auto",
                  alignItems: "center", gap: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className={`mi-badge ${badgeClass}`}>{ev.evidence_type?.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{ev.source}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                    {ev.competency_ids.join(" · ")} · {new Date(ev.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)", textAlign: "right" }}>
                  {Math.round(ev.confidence * 100)}%
                </div>
                <div style={{ width: 48, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: TYPE_COLOR[typeLower] || "var(--text-faint)", width: `${ev.confidence * 100}%`, borderRadius: 99 }} />
                </div>
                <div style={{ color: "var(--text-faint)", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</div>
              </button>
              {isExpanded && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ paddingTop: 14 }}>
                    {ev.text ? (
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 12px", fontStyle: "italic" }}>
                        "{ev.text}"
                      </p>
                    ) : (
                      <p style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic", margin: "0 0 12px" }}>No text excerpt available.</p>
                    )}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)" }}>ID: {ev.id}</span>
                      {ev.attempt_id && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)" }}>Attempt: {ev.attempt_id}</span>}
                      {ev.question_id && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)" }}>Q: {ev.question_id}</span>}
                    </div>

                    {/* Competency → Score chain */}
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {ev.competency_ids.map((cid) => {
                        const ev2 = evalMap[cid];
                        return (
                          <div key={cid} style={{
                            padding: "6px 10px", borderRadius: 7,
                            background: "var(--bg-overlay)", border: "1px solid var(--border)",
                            fontSize: 11,
                          }}>
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint)", marginRight: 6 }}>{cid}</span>
                            <span style={{ color: "var(--text-secondary)", marginRight: 6 }}>{COMP_NAMES[cid] || cid}</span>
                            {ev2 && (
                              <>
                                <span style={{ color: "var(--text-faint)" }}>→</span>
                                <span style={{ marginLeft: 6, fontWeight: 700, color: ev2.score >= 80 ? "var(--emerald)" : ev2.score >= 65 ? "var(--blue)" : "var(--amber)" }}>
                                  {Math.round(ev2.score)}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Source weights */}
      {Object.keys(weights).length > 0 && (
        <div className="mi-panel" style={{ marginTop: 24 }}>
          <div className="mi-eyebrow" style={{ marginBottom: 12 }}>SOURCE WEIGHTING</div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px" }}>
            Each evidence source has a reliability weight applied during evidence confidence calculation.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(weights).map(([type, weight]) => (
              <div key={type} style={{
                padding: "8px 12px", borderRadius: 8,
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span className={`mi-badge ${TYPE_BADGE[type.toLowerCase()] || "mi-badge-muted"}`}>
                  {type.replace(/_/g, " ")}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--blue)" }}>
                  {Number(weight).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Continue to Diagnose CTA */}
      <div className="mi-panel-glow-blue" style={{ marginTop: 24, textAlign: "center", padding: 32 }}>
        <div className="mi-eyebrow" style={{ color: "var(--blue)", marginBottom: 8 }}>NEXT STAGE: CAPABILITY DIAGNOSIS</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
          Evidence Review Complete
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, maxWidth: 500, margin: "0 auto 20px" }}>
          Review the collected evidence above and proceed to synthesize capability diagnosis.
        </p>
        <Link href="/diagnosis" className="mi-btn mi-btn-primary" style={{ padding: "12px 32px", fontSize: 14 }}>
          Continue to Diagnose →
        </Link>
      </div>
    </div>
  );
}
