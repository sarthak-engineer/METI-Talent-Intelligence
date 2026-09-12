"use client";
import { API_BASE_URL } from "@/app/utils/api";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DevelopmentPage() {
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
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
        let fullData = null;
        const repRes = await fetch(`${API_BASE_URL}/api/reports/${cid}`);
        if (repRes.ok) {
          fullData = await repRes.json();
        } else {
          // fallback to raw analysis if report doesn't exist
          const anRes = await fetch(`${API_BASE_URL}/api/analysis/${cid}`);
          if (anRes.ok) {
            fullData = { detailed_report: await anRes.json() };
          }
        }

        if (fullData && fullData.detailed_report) {
          setReportData(fullData.detailed_report);
        } else if (fullData && fullData.development_plan) {
          setReportData(fullData);
        } else {
          setReportData(null);
        }
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
            <div className="mi-loading-title">Loading Development Plan</div>
            <div className="mi-loading-sub">Retrieving gap analysis…</div>
          </div>
        </div>
      </div>
    );
  }

  // ─── NO CANDIDATE GUARD ───
  if (!candidateId) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 640 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">DEVELOPMENT PLAN</div>
          <h1 className="mi-page-title">Evidence-backed priorities for your target role.</h1>
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

  const hasAnalysis = !!reportData;
  const devPlan = reportData?.development_plan;
  const summary = reportData?.executive_summary || reportData;
  
  if (!hasAnalysis) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 640 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">DEVELOPMENT PLAN</div>
          <h1 className="mi-page-title">Development Roadmap</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>⚡</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Complete diagnosis first.</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, maxWidth: 460, margin: "0 auto 24px" }}>
            No valid analysis exists for this candidate.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/assessment" className="mi-btn mi-btn-ghost">Take Assessment</Link>
            <Link href="/diagnosis" className="mi-btn mi-btn-primary">Generate Diagnosis →</Link>
          </div>
        </div>
      </div>
    );
  }

  const noData = !devPlan || !devPlan.priorities || devPlan.priorities.length === 0;

  if (noData) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 640 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">DEVELOPMENT PLAN</div>
          <h1 className="mi-page-title">Development Roadmap</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>No priority development gaps identified for the current role profile.</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, maxWidth: 460, margin: "0 auto 24px" }}>
            Maintain evidence, expand depth, and prepare for reassessment.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/reports" className="mi-btn mi-btn-primary">View Full Report →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mi-page-inner">
      <div className="mi-page-header">
        <div className="mi-eyebrow">DEVELOPMENT PLAN</div>
        <h1 className="mi-page-title">Evidence-backed priorities for your target role.</h1>
      </div>

      {/* Header Stats */}
      {summary && (
        <div className="mi-panel" style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Target Role</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--violet)" }}>{summary.target_role || summary.primary_role || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Overall Readiness</div>
            {summary.readiness_status ? (
              <span className={`mi-badge ${summary.readiness_status === "READY" ? "mi-badge-emerald" : summary.readiness_status === "DEVELOPING" ? "mi-badge-blue" : "mi-badge-amber"}`} style={{ fontSize: 13, padding: "4px 8px" }}>
                {summary.readiness_status.replace(/_/g, " ")}
              </span>
            ) : (
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>—</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>CCI</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--blue)" }}>{summary.cci !== undefined ? Math.round(summary.cci) : "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Evidence Confidence</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--emerald)" }}>{summary.evidence_confidence !== undefined ? `${Math.round(summary.evidence_confidence * 100)}%` : "—"}</div>
          </div>
        </div>
      )}

      {/* Priorities List */}
      <div className="mi-eyebrow" style={{ marginBottom: 16 }}>TOP DEVELOPMENT PRIORITIES</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {devPlan.priorities.map((priority: any, idx: number) => (
          <div key={idx} className="mi-panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Priority Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 4 }}>PRIORITY {idx + 1}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>{priority.competency_name || priority.competency_id}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className={`mi-badge ${priority.gap_type === "EVIDENCE_GAP" ? "mi-badge-amber" : "mi-badge-red"}`}>
                    {priority.gap_type.replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {priority.gap_type === "CAPABILITY_GAP" 
                      ? "Current evidence indicates development is needed." 
                      : "More evidence is needed before capability can be confidently assessed."}
                  </span>
                </div>
              </div>
            </div>

            {/* Current -> Target -> Gap */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, background: "var(--bg-elevated)", padding: 16, borderRadius: 8 }}>
              {priority.gap_type === "CAPABILITY_GAP" ? (
                <>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Current Level</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{priority.current_score !== null ? `${Math.round(priority.current_score)}/100` : "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Target Level</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{priority.required_level !== null ? `${Math.round(priority.required_level)}/100` : "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Gap</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--red)" }}>{priority.gap !== null ? `${Math.round(priority.gap)} points` : "—"}</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Current Level</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--amber)" }}>Not assessed</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Target Level</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{priority.required_level !== null ? `${Math.round(priority.required_level)}/100` : "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Evidence Status</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)" }}>Insufficient</div>
                  </div>
                </>
              )}
            </div>

            {/* Content Blocks */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase" }}>Why It Matters</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>{priority.why_it_matters}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", marginBottom: 6, textTransform: "uppercase" }}>Recommended Action</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>{priority.recommended_action}</div>
              </div>

              {priority.evidence_to_produce && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--violet)", marginBottom: 6, textTransform: "uppercase" }}>Evidence To Produce</div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>{priority.evidence_to_produce}</div>
                </div>
              )}

              {priority.success_measure && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--emerald)", marginBottom: 6, textTransform: "uppercase" }}>Success Measure</div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>{priority.success_measure}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Next Steps Footer */}
      <div className="mi-panel" style={{ textAlign: "center", padding: 40, background: "rgba(59,130,246,0.03)", border: "1px solid var(--border-blue)" }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🔄</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", marginBottom: 8, textTransform: "uppercase" }}>NEXT STEP</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
          Build new evidence against these priorities, then reassess your capability.
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
          <span>Diagnosis</span>
          <span>→</span>
          <span style={{ color: "var(--blue)" }}>Action</span>
          <span>→</span>
          <span>New Evidence</span>
          <span>→</span>
          <span>Reassessment</span>
        </div>
      </div>
    </div>
  );
}
