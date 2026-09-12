"use client";
import { API_BASE_URL } from "@/app/utils/api";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReportsPage() {
  const [candidateId, setCandidateId] = useState("");
  const [report, setReport] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    const cid = localStorage.getItem("candidate_id");
    if (cid) {
      setCandidateId(cid);
      fetchReport(cid);
    } else {
      setCandidateId("");
      setFetched(true);
    }
  }, []);

  async function fetchReport(cid?: string) {
    const id = cid || candidateId;
    if (!id || !id.trim()) {
      setFetched(true);
      return;
    }
    setLoading(true);
    setError("");
    setReport(null);
    setMeta(null);
    setFetched(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to load report");
      }
      const data = await res.json();
      setMeta({
        candidate_id: data.candidate_id,
        snapshot_id: data.snapshot_id,
        attempt_id: data.attempt_id,
        entitlement: data.entitlement,
        summary: data.summary,
      });
      if (data.detailed_report) setReport(data.detailed_report);
      setFetched(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const printStyles = `
    @media print {
      :root, body, html {
        --bg-base: #ffffff !important;
        --bg-elevated: #f9fafb !important;
        --border: #e5e7eb !important;
        --border-blue: #bfdbfe !important;
        --border-emerald: #a7f3d0 !important;
        --border-amber: #fde68a !important;
        --text-primary: #111827 !important;
        --text-secondary: #374151 !important;
        --text-muted: #6b7280 !important;
        --text-faint: #9ca3af !important;
        --blue: #2563eb !important;
        --emerald: #059669 !important;
        --amber: #d97706 !important;
        --cyan: #0891b2 !important;
        --violet: #7c3aed !important;
        --red: #dc2626 !important;
        --blue-dim: #eff6ff !important;
      }
      
      .mi-sidebar, .no-print { display: none !important; }
      .mi-page { margin-left: 0 !important; padding: 0 !important; background: white !important; }
      .mi-page-inner { max-width: 100% !important; margin: 0 !important; }
      
      .page-break { page-break-before: always; margin-top: 20px; }
      .avoid-break { page-break-inside: avoid; }
      @page { margin: 16mm; size: A4 portrait; }
      
      body { background: white !important; color: #111827 !important; }
      
      .mi-panel { 
        box-shadow: none !important; 
        border: 1px solid var(--border) !important;
      }
    }
  `;

  const r = report;
  const s = meta?.summary;

  if (!candidateId && fetched) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 640 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">DELIVERABLE</div>
          <h1 className="mi-page-title">Diagnosis Report</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>👤</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            No Active Candidate Session
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>
            Please complete candidate onboarding first to setup your profile and start the capability assessment.
          </p>
          <Link href="/onboarding" className="mi-btn mi-btn-primary">
            Complete Profile First →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      <div className="mi-page-inner">
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <div className="mi-eyebrow">DELIVERABLE ({candidateId})</div>
            <h1 className="mi-page-title">Diagnosis Report</h1>
          </div>
          {fetched && r && (
            <button className="mi-btn mi-btn-primary" onClick={() => window.print()}>
              ⬇ Export PDF
            </button>
          )}
        </div>

        {error && (
          <div className="no-print" style={{ padding: "12px 16px", marginBottom: 16, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "var(--red)", fontSize: 13 }}>
            {error}
          </div>
        )}

        {meta && (
          <div className="mi-panel no-print" style={{ marginBottom: 20 }}>
            <div className="mi-eyebrow" style={{ marginBottom: 12 }}>REPORT STATUS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 3 }}>Candidate</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{meta.candidate_id}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 3 }}>Snapshot</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>{meta.snapshot_id?.slice(0, 14)}…</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 3 }}>Report Access</div>
                <span className={`mi-badge ${meta.entitlement?.detailed_report_access ? "mi-badge-emerald" : "mi-badge-amber"}`}>
                  {meta.entitlement?.detailed_report_access ? "Granted" : "Restricted"}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 3 }}>Review Status</div>
                {r?.review ? (
                  <span className={`mi-badge ${r.review.status === 'approved' ? "mi-badge-emerald" : r.review.status === 'adjusted' ? "mi-badge-blue" : r.review.required ? "mi-badge-amber" : "mi-badge-muted"}`}>
                    {r.review.status === 'approved' ? "Approved" : r.review.status === 'adjusted' ? "Adjusted" : r.review.required ? "Pending" : "Not Required"}
                  </span>
                ) : (
                  <span className={`mi-badge ${meta.entitlement?.human_reviewed ? "mi-badge-emerald" : "mi-badge-amber"}`}>
                    {meta.entitlement?.human_reviewed ? "Reviewed" : "Pending / AI"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {fetched && !r && meta?.entitlement && !meta.entitlement.detailed_report_access && (
          <div className="mi-panel no-print" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Detailed Report Access</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 480, margin: "0 auto 20px" }}>
              Generate or unlock the detailed capability diagnosis report for this candidate snapshot.
            </p>
            <button
              className="mi-btn mi-btn-primary"
              style={{ marginBottom: 20 }}
              onClick={async () => {
                try {
                  await fetch(`${API_BASE_URL}/api/entitlements/${candidateId}/upgrade`, { method: "POST" });
                  fetchReport();
                } catch {}
              }}
            >
              Generate Full Report →
            </button>
          </div>
        )}

        {fetched && !r && !s && (
          <div className="mi-panel no-print" style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>⚡</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Complete diagnosis first to generate your report.
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 480, margin: "0 auto 24px" }}>
              No analysis snapshot exists for candidate <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{candidateId}</span>.
            </p>
          </div>
        )}

        {r && (
          <div id="print-area">
            {/* PAGE 1: EXECUTIVE DIAGNOSIS */}
            <div className="avoid-break" style={{ marginBottom: 32 }}>
              <div className="mi-eyebrow no-print" style={{ color: "var(--blue)" }}>PAGE 1</div>
              <div className="mi-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="mi-eyebrow">METI · CONSULTING CAPABILITY DIAGNOSIS</div>
                    <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: "8px 0 4px", letterSpacing: "-0.02em" }}>
                      {r.executive_summary?.candidate_name || meta?.candidate_id}
                    </h2>
                    <div style={{ fontSize: 15, color: "var(--text-muted)", fontWeight: 600 }}>
                      Target: {r.executive_summary?.target_role || r.executive_summary?.primary_role || "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                      {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>

                <div className="mi-divider" style={{ margin: "24px 0" }} />

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                  {r.executive_summary?.cci !== undefined && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>CCI</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: "var(--blue)" }}>{Math.round(r.executive_summary.cci)}</div>
                    </div>
                  )}
                  {r.executive_summary?.evidence_confidence !== undefined && (
                    <div title="Confidence in the evidence-backed assessment, NOT candidate ability">
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Evidence Confidence</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: "var(--emerald)" }}>{Math.round(r.executive_summary.evidence_confidence * 100)}%</div>
                    </div>
                  )}
                  {r.executive_summary?.evidence_coverage !== undefined && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Coverage</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: "var(--cyan)" }}>{Math.round(r.executive_summary.evidence_coverage * 100)}%</div>
                    </div>
                  )}
                  {r.executive_summary?.readiness_status && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Readiness</div>
                      <div className={`mi-badge ${r.executive_summary.readiness_status === "READY" ? "mi-badge-emerald" : r.executive_summary.readiness_status === "DEVELOPING" ? "mi-badge-blue" : "mi-badge-amber"}`} style={{ fontSize: 14, padding: "6px 12px", marginTop: 4 }}>
                        {r.executive_summary.readiness_status.replace(/_/g, " ")}
                      </div>
                    </div>
                  )}
                </div>

                {r.executive_summary?.narrative && (
                  <div style={{ background: "rgba(59,130,246,0.04)", padding: 20, borderRadius: 8, border: "1px solid var(--border-blue)" }}>
                    <div className="mi-eyebrow" style={{ marginBottom: 10, color: "var(--blue)" }}>EXECUTIVE SUMMARY</div>
                    <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7, margin: 0 }}>{r.executive_summary.narrative}</p>
                  </div>
                )}
              </div>
            </div>

            {/* PAGE 2: CAPABILITY DIAGNOSIS */}
            <div className="page-break avoid-break">
              <div className="mi-eyebrow no-print" style={{ color: "var(--blue)" }}>PAGE 2</div>
              <div className="mi-panel">
                <div className="mi-eyebrow" style={{ marginBottom: 20, fontSize: 16 }}>CAPABILITY DIAGNOSIS</div>
                
                {r.competency_analysis?.length > 0 ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {r.competency_analysis.map((ev: any) => (
                        <div key={ev.competency_id} style={{
                          display: "grid", gridTemplateColumns: "1fr 100px 100px",
                          alignItems: "center", gap: 16,
                          padding: "16px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8
                        }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{ev.competency_name || ev.competency_id}</div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <span className="mi-badge mi-badge-muted" style={{ fontSize: 10 }}>{ev.competency_id}</span>
                              <span className="mi-badge mi-badge-muted" style={{ fontSize: 10 }}>Evidence: {ev.evidence_ids?.length || 0}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Score</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: ev.score >= 80 ? "var(--emerald)" : ev.score >= 65 ? "var(--blue)" : "var(--amber)" }}>
                              {Math.round(ev.score)}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Confidence</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)" }}>
                              {Math.round(ev.confidence * 100)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
                      <div style={{ padding: 16, border: "1px solid var(--border-emerald)", borderRadius: 8, background: "rgba(16,185,129,0.04)" }}>
                        <div className="mi-eyebrow" style={{ color: "var(--emerald)", marginBottom: 12 }}>TOP STRENGTHS</div>
                        {r.strengths?.length > 0 ? r.strengths.map((s: any, i: number) => (
                          <div key={i} style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>✓ {s.competency_name} ({Math.round(s.score)})</div>
                        )) : <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No strengths identified.</div>}
                      </div>
                      <div style={{ padding: 16, border: "1px solid var(--border-amber)", borderRadius: 8, background: "rgba(245,158,11,0.04)" }}>
                        <div className="mi-eyebrow" style={{ color: "var(--amber)", marginBottom: 12 }}>PRIORITY GAPS</div>
                        {r.development_priorities?.length > 0 ? r.development_priorities.map((p: any, i: number) => (
                          <div key={i} style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>⚠ {p.competency_name} ({Math.round(p.score)})</div>
                        )) : <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No significant gaps identified.</div>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Not assessed</div>
                )}
              </div>
            </div>

            {/* PAGE 3: EVIDENCE EXPLORER */}
            <div className="page-break avoid-break">
              <div className="mi-eyebrow no-print" style={{ color: "var(--blue)" }}>PAGE 3</div>
              <div className="mi-panel">
                <div className="mi-eyebrow" style={{ marginBottom: 20, fontSize: 16 }}>EVIDENCE EXPLORER</div>
                {r.evidence_explorer?.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {r.evidence_explorer.map((ev: any, idx: number) => (
                      <div key={idx} style={{ borderBottom: idx < r.evidence_explorer.length - 1 ? "2px solid var(--border)" : "none", paddingBottom: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase" }}>{ev.competency_name}</div>
                          </div>
                          <div style={{ textAlign: "right", display: "flex", gap: 16 }}>
                            <div>
                              <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase" }}>Score</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--blue)" }}>{Math.round(ev.score)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase" }} title="Confidence in this evaluation based on evidence quality">Eval Confidence</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)" }}>{Math.round((ev.confidence || 0) * 100)}%</div>
                            </div>
                          </div>
                        </div>

                        <div className="mi-eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>SUPPORTING EVIDENCE</div>
                        {ev.evidence_details?.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {ev.evidence_details.map((detail: any, dIdx: number) => (
                              <div key={dIdx} style={{ padding: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: "3px solid var(--blue)", borderRadius: 4 }}>
                                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                  <span className="mi-badge mi-badge-muted" style={{ fontSize: 10 }}>[{detail.id?.slice(0, 8) || "EV"}]</span>
                                  <span className="mi-badge mi-badge-violet" style={{ fontSize: 10 }}>{detail.source}</span>
                                  <span className="mi-badge mi-badge-cyan" style={{ fontSize: 10 }}>Conf: {Math.round((detail.source_confidence || 0) * 100)}%</span>
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                  "{detail.text || detail.description}"
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>No supporting evidence available.</div>
                        )}
                      </div>
                    ))}
                    
                    {/* Unmapped evidence */}
                    {r.unmapped_evidence?.length > 0 && (
                      <div style={{ paddingTop: 24, borderTop: "2px solid var(--border)" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", marginBottom: 12 }}>Unmapped Evidence</div>
                        <div className="mi-eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>AVAILABLE EVIDENCE NOT SUPPORTING A SPECIFIC COMPETENCY</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {r.unmapped_evidence.map((detail: any, dIdx: number) => (
                            <div key={`unmapped-${dIdx}`} style={{ padding: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: "3px solid var(--amber)", borderRadius: 4 }}>
                              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <span className="mi-badge mi-badge-muted" style={{ fontSize: 10 }}>[{detail.id?.slice(0, 8) || "EV"}]</span>
                                <span className="mi-badge mi-badge-violet" style={{ fontSize: 10 }}>{detail.source}</span>
                                <span className="mi-badge mi-badge-cyan" style={{ fontSize: 10 }}>Conf: {Math.round((detail.source_confidence || 0) * 100)}%</span>
                              </div>
                              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                "{detail.text || detail.description}"
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Insufficient evidence</div>
                )}
              </div>
            </div>

            {/* PAGE 4: ROLE INTELLIGENCE */}
            <div className="page-break avoid-break">
              <div className="mi-eyebrow no-print" style={{ color: "var(--blue)" }}>PAGE 4</div>
              <div className="mi-panel">
                <div className="mi-eyebrow" style={{ marginBottom: 20, fontSize: 16 }}>ROLE INTELLIGENCE</div>
                {r.role_intelligence?.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {r.role_intelligence.map((role: any, idx: number) => (
                      <div key={idx} style={{ padding: 20, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{role.role_name}</div>
                          <span className={`mi-badge ${role.readiness_status === "READY" ? "mi-badge-emerald" : role.readiness_status === "DEVELOPING" ? "mi-badge-blue" : "mi-badge-amber"}`} style={{ fontSize: 13, padding: "6px 12px" }}>
                            {role.readiness_status.replace(/_/g, " ")}
                          </span>
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Role Alignment</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--violet)" }}>{Math.round(role.match_score)}%</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Requirements Met</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{role.requirements_met} / {role.requirements_total}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Evidence Confidence</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-secondary)" }}>{Math.round(role.confidence * 100)}%</div>
                          </div>
                        </div>

                        {role.blocking_gaps?.length > 0 && (
                          <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.05)", borderLeft: "3px solid var(--red)", borderRadius: 4 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--red)", marginBottom: 6 }}>BLOCKING GAPS</div>
                            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-secondary)" }}>
                              {role.blocking_gaps.map((gap: string, gIdx: number) => (
                                <li key={gIdx} style={{ marginBottom: 4 }}>{gap}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Not assessed</div>
                )}
              </div>
            </div>

            {/* PAGE 5: DEVELOPMENT PLAN */}
            <div className="page-break avoid-break">
              <div className="mi-eyebrow no-print" style={{ color: "var(--blue)" }}>PAGE 5</div>
              <div className="mi-panel">
                <div className="mi-eyebrow" style={{ marginBottom: 20, fontSize: 16 }}>DEVELOPMENT PLAN</div>
                {r.development_plan?.priorities?.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {r.development_plan.priorities.map((priority: any, idx: number) => (
                      <div key={idx} style={{ padding: 20, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--blue-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--blue)" }}>
                            {idx + 1}
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{priority.competency_name || priority.competency_id}</div>
                          <span className={`mi-badge ${priority.gap_type === "EVIDENCE_GAP" ? "mi-badge-violet" : "mi-badge-amber"}`} style={{ marginLeft: "auto" }}>
                            {priority.gap_type.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                          {priority.gap_type === "CAPABILITY_GAP" ? (
                            <>
                              <div>
                                <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase" }}>Current Score</div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{Math.round(priority.current_score || 0)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase" }}>Required Level</div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{Math.round(priority.required_level || 0)}</div>
                              </div>
                            </>
                          ) : (
                            <div style={{ gridColumn: "span 2" }}>
                              <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase" }}>Evidence Status</div>
                              <div style={{ fontSize: 14, color: "var(--text-primary)" }}>Insufficient validated evidence to meet target confidence threshold.</div>
                            </div>
                          )}
                        </div>

                        <div style={{ background: "var(--bg-base)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>RECOMMENDED ACTION</div>
                          <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 8 }}>{priority.recommended_action || "Continue development in this area."}</div>
                          
                          {priority.success_measure && (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>SUCCESS MEASURE</div>
                              <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{priority.success_measure}</div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No priority development gaps identified for the current role profile.</div>
                )}
              </div>
            </div>

            {/* PAGE 6: EVIDENCE CONFIDENCE & REVIEW */}
            <div className="page-break avoid-break">
              <div className="mi-eyebrow no-print" style={{ color: "var(--blue)" }}>PAGE 6</div>
              <div className="mi-panel">
                <div className="mi-eyebrow" style={{ marginBottom: 20, fontSize: 16 }}>EVIDENCE CONFIDENCE & REVIEW</div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                  <div style={{ padding: 20, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 12 }}>Confidence Metrics</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 16, fontStyle: "italic" }}>Note: Evidence Confidence reflects system confidence in the evidence-backed assessment, NOT the candidate's actual ability.</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Overall Confidence</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{Math.round((r.executive_summary?.evidence_confidence || 0) * 100)}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Framework Coverage</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{Math.round((r.executive_summary?.evidence_coverage || 0) * 100)}%</span>
                    </div>

                    <div style={{ margin: "16px 0", height: 1, background: "var(--border)" }} />

                    <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 12 }}>Evidence Sources Utilised</div>
                    {r.evidence_profile?.sources?.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-primary)" }}>
                        {r.evidence_profile.sources.map((s: string, i: number) => (
                          <li key={i} style={{ marginBottom: 4 }}>{s.replace(/_/g, " ")}</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No evidence sources recorded.</div>
                    )}
                  </div>

                  <div style={{ padding: 20, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 12 }}>Human Review Status</div>
                    
                    {r.review?.required || r.review?.status !== "pending" ? (
                      <>
                        <div style={{ display: "inline-block", padding: "6px 12px", background: r.review?.status === "approved" ? "var(--emerald-dim)" : r.review?.status === "adjusted" ? "var(--blue-dim)" : "var(--amber-dim)", color: r.review?.status === "approved" ? "var(--emerald)" : r.review?.status === "adjusted" ? "var(--blue)" : "var(--amber)", borderRadius: 4, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                          HUMAN REVIEW: {r.review?.status ? r.review.status.toUpperCase() : "PENDING"}
                        </div>
                        
                        {r.review?.reasons?.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Trigger Reasons:</div>
                            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-primary)" }}>
                              {r.review.reasons.map((reason: string, i: number) => (
                                <li key={i}>{reason.replace(/_/g, " ")}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {r.review?.status === "pending" && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", marginTop: 8 }}>
                            Client-facing readiness recommendations require human review.
                          </div>
                        )}

                        {r.human_review?.reviewer_notes && (
                          <div style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 4, borderLeft: "3px solid var(--blue)", marginTop: 12 }}>
                            <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>Reviewer Notes</div>
                            <div style={{ fontSize: 13, color: "var(--text-primary)", fontStyle: "italic" }}>"{r.human_review.reviewer_notes}"</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.7 }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                        <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>Human review not currently required</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 4 }}>Evidence confidence and integrity checks passed automated thresholds.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PAGE 7: REASSESSMENT / EVIDENCE EVOLUTION */}
            <div className="page-break avoid-break">
              <div className="mi-eyebrow no-print" style={{ color: "var(--blue)" }}>PAGE 7</div>
              <div className="mi-panel">
                <div className="mi-eyebrow" style={{ marginBottom: 20, fontSize: 16 }}>EVIDENCE EVOLUTION</div>
                
                {r.evidence_evolution?.previous_snapshot_id ? (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                      <div style={{ padding: 16, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>CCI Evolution</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{Math.round(r.evidence_evolution.current_cci || 0)}</span>
                          <span style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "line-through" }}>{Math.round(r.evidence_evolution.previous_cci || 0)}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: (r.evidence_evolution.current_cci - r.evidence_evolution.previous_cci) >= 0 ? "var(--emerald)" : "var(--amber)" }}>
                            {(r.evidence_evolution.current_cci - r.evidence_evolution.previous_cci) >= 0 ? "+" : ""}{Math.round((r.evidence_evolution.current_cci - r.evidence_evolution.previous_cci) || 0)}
                          </span>
                        </div>
                      </div>
                      <div style={{ padding: 16, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>Confidence Evolution</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{Math.round((r.evidence_evolution.current_confidence || 0) * 100)}%</span>
                          <span style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "line-through" }}>{Math.round((r.evidence_evolution.previous_confidence || 0) * 100)}%</span>
                        </div>
                      </div>
                      <div style={{ padding: 16, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>Coverage Evolution</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{Math.round((r.evidence_evolution.current_coverage || 0) * 100)}%</span>
                          <span style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "line-through" }}>{Math.round((r.evidence_evolution.previous_coverage || 0) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div>
                        <div className="mi-eyebrow" style={{ marginBottom: 12 }}>RESOLVED GAPS</div>
                        {r.evidence_evolution.resolved_gaps?.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-primary)" }}>
                            {r.evidence_evolution.resolved_gaps.map((gap: string, i: number) => (
                              <li key={i} style={{ marginBottom: 4, color: "var(--emerald)" }}>{gap}</li>
                            ))}
                          </ul>
                        ) : <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No gaps resolved in this cycle.</div>}
                      </div>
                      <div>
                        <div className="mi-eyebrow" style={{ marginBottom: 12 }}>NEW EVIDENCE MAPPED</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--blue)" }}>{r.evidence_evolution.new_evidence_count || 0} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-secondary)" }}>records</span></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📈</div>
                    <div style={{ fontSize: 15, color: "var(--text-primary)", fontWeight: 600 }}>Reassessment comparison will appear after a subsequent diagnosis.</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>This is the first analysis snapshot for this candidate.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="no-print" style={{ padding: "20px 0", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
              <span>METI Capability Diagnosis · Confidential</span>
              <span>{new Date().toISOString().slice(0, 10)}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
