"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatScore, formatPercent, formatReadiness } from "./utils/format";
import { fetchCandidateJourney, CandidateJourneyData } from "./utils/journey";

export default function OverviewPage() {
  const [journey, setJourney] = useState<CandidateJourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      const cid = localStorage.getItem("candidate_id");
      try {
        setLoading(true);
        const data = await fetchCandidateJourney(cid);
        setJourney(data);
      } catch {
        setError(true);
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
            <div className="mi-loading-title">Loading Intelligence</div>
            <div className="mi-loading-sub">Retrieving candidate journey state...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !journey) {
    return (
      <div className="mi-loading-screen">
        <div className="mi-error-card">
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
          <h1>Unable to load overview</h1>
          <p>Could not connect to the METI intelligence service. Ensure the backend is running on port 8000.</p>
          <button className="mi-btn mi-btn-primary" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { candidateId, candidateName, analysisSnapshot, hasAnalysis, nextAction, steps } = journey;

  const cci = analysisSnapshot?.cci != null ? Math.round(analysisSnapshot.cci) : null;
  const coverage = analysisSnapshot?.evidence_coverage != null ? Math.round(analysisSnapshot.evidence_coverage * 100) : null;
  const confidence = analysisSnapshot?.evidence_confidence != null ? Math.round(analysisSnapshot.evidence_confidence * 100) : null;
  const primaryRole = analysisSnapshot?.role_matches?.[0];

  const readinessMap = (analysisSnapshot?.role_readiness ?? []).reduce((acc: any, curr: any) => {
    if (curr.role_id) acc[curr.role_id] = curr;
    return acc;
  }, {});

  return (
    <div className="mi-page-inner">
      {/* Landing Entry Hero Banner */}
      <div className="mi-panel" style={{ marginBottom: 24, padding: "28px 32px", background: "linear-gradient(135deg, rgba(15,23,38,0.9), rgba(17,27,45,0.9))", borderColor: "var(--border-blue)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          <div style={{ maxWidth: 640 }}>
            <div className="mi-eyebrow" style={{ color: "var(--blue)" }}>METI · ENTERPRISE TALENT INTELLIGENCE</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: "6px 0 10px", letterSpacing: "-0.02em" }}>
              Evidence-first talent intelligence for capability, role readiness and development.
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              METI triangulates candidate claims across resumes, assessments, consulting work samples, interviews and portfolio evidence to produce explainable, confidence-aware capability insights.
            </p>
          </div>
          <div>
            <Link href={nextAction.href} className="mi-btn mi-btn-primary" style={{ padding: "12px 24px", fontSize: 14 }}>
              {nextAction.buttonText}
            </Link>
          </div>
        </div>

        {/* Workflow Explanation */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", marginBottom: 4 }}>1. EVIDENCE COLLECTION</div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>Multi-Modal Signals</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Resume claims, diagnostic scenarios, consulting cases, and structured interview responses.</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--violet)", marginBottom: 4 }}>2. CAPABILITY DIAGNOSIS</div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>Deterministic Metric Scoring</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Objective CCI scoring, evidence coverage, confidence weighting, and role alignment profiles.</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--emerald)", marginBottom: 4 }}>3. DEVELOPMENT PATHWAY</div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>Actionable Growth Strategy</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Targeted competency interventions, deliberate practice recommendations, and evolution tracking.</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mi-page-header">
        <div className="mi-eyebrow">CANDIDATE OVERVIEW {candidateId ? `(${candidateName || candidateId})` : "— NO ACTIVE SESSION"}</div>
        <h1 className="mi-page-title">Capability Intelligence</h1>
        <p className="mi-page-subtitle">
          {candidateId
            ? "Current capability state derived from candidate evidence across the evaluation lifecycle."
            : "No active candidate session. Complete onboarding to create a candidate profile and start assessment."}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="mi-metric-grid mi-metric-grid-4" style={{ marginBottom: 24 }}>
        <div className="mi-metric" style={{ borderColor: "var(--border-blue)" }}>
          <div className="mi-metric-label">Capability Score / CCI</div>
          <div className="mi-metric-value blue">{hasAnalysis ? formatScore(analysisSnapshot?.cci) : "Not assessed"}</div>
          <div className="mi-progress-track" style={{ marginTop: 10 }}>
            <div className="mi-progress-fill" style={{ width: `${cci ?? 0}%` }} />
          </div>
          <div className="mi-metric-sub">Demonstrated capability estimate</div>
        </div>

        <div className="mi-metric">
          <div className="mi-metric-label">Evidence Coverage</div>
          <div className="mi-metric-value cyan">{hasAnalysis ? formatPercent(analysisSnapshot?.evidence_coverage) : "0%"}</div>
          <div className="mi-progress-track" style={{ marginTop: 10 }}>
            <div className="mi-progress-fill cyan" style={{ width: `${coverage ?? 0}%` }} />
          </div>
          <div className="mi-metric-sub">Framework coverage supported by evidence</div>
        </div>

        <div className="mi-metric">
          <div className="mi-metric-label">Evidence Confidence</div>
          <div className="mi-metric-value emerald">{hasAnalysis ? formatPercent(analysisSnapshot?.evidence_confidence) : "—"}</div>
          <div className="mi-progress-track" style={{ marginTop: 10 }}>
            <div className="mi-progress-fill emerald" style={{ width: `${confidence ?? 0}%` }} />
          </div>
          <div className="mi-metric-sub">Confidence in the evidence-backed assessment</div>
        </div>

        <div className="mi-metric" style={{ borderColor: "var(--border-violet)" }}>
          <div className="mi-metric-label">Primary Role Alignment</div>
          <div className="mi-metric-value violet">
            {hasAnalysis ? formatPercent(primaryRole?.match_score) : "Not determined"}
          </div>
          <div className="mi-progress-track" style={{ marginTop: 10 }}>
            <div className="mi-progress-fill violet" style={{ width: `${primaryRole ? Math.round(primaryRole.match_score) : 0}%` }} />
          </div>
          <div className="mi-metric-sub">{hasAnalysis ? (primaryRole?.role_name ?? "—") : "Complete diagnosis first"}</div>
        </div>
      </div>

      {/* METI JOURNEY Canonical Lifecycle Stepper */}
      <div className="mi-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div className="mi-eyebrow">METI JOURNEY</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Candidate Journey Progress</div>
          </div>
          <div className="mi-badge mi-badge-blue" style={{ fontSize: 11 }}>
            Stage: {nextAction.label}
          </div>
        </div>

        {/* Stepper Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          {steps.map((step) => {
            const isComplete = step.status === "complete";
            const isAvailable = step.status === "available";
            const isLocked = step.status === "locked";

            return (
              <Link
                key={step.id}
                href={isLocked ? "#" : step.href}
                onClick={(e) => { if (isLocked) e.preventDefault(); }}
                style={{
                  textDecoration: "none",
                  padding: "14px",
                  borderRadius: 8,
                  background: step.isNext ? "rgba(59,130,246,0.12)" : isComplete ? "var(--bg-elevated)" : "var(--bg-base)",
                  border: `1px solid ${step.isNext ? "var(--border-blue)" : isComplete ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                  opacity: isLocked ? 0.6 : 1,
                  cursor: isLocked ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: step.isNext ? "var(--blue)" : isComplete ? "var(--emerald)" : "var(--text-secondary)" }}>
                    {step.name}
                  </div>
                  <span className={`mi-badge ${isComplete ? "mi-badge-emerald" : isAvailable ? "mi-badge-blue" : "mi-badge-muted"}`}>
                    {isComplete ? "✓ Complete" : isAvailable ? "○ Available" : "🔒 Locked"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {isComplete ? "Stage finished" : isAvailable ? (step.isNext ? "Next required step" : "Available to start") : (step.missingPrerequisite || "Prerequisite required")}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Primary Action Hero Card */}
      <div className="mi-panel-glow-blue" style={{ marginBottom: 24, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
        <div>
          <div className="mi-eyebrow" style={{ color: "var(--blue)" }}>NEXT REQUIRED ACTION</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: "4px 0 4px" }}>
            {nextAction.label}
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            {nextAction.description}
          </p>
        </div>
        <Link href={nextAction.href} className="mi-btn mi-btn-primary" style={{ padding: "12px 24px", fontSize: 14, flexShrink: 0 }}>
          {nextAction.buttonText}
        </Link>
      </div>

      {/* Role Intelligence Summary if analysis exists */}
      {hasAnalysis && analysisSnapshot?.role_matches?.length > 0 ? (
        <div className="mi-panel">
          <div style={{ marginBottom: 14 }}>
            <div className="mi-eyebrow">CURRENT INTELLIGENCE</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Role Intelligence Summary</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>alignment ≠ readiness ≠ suitability</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analysisSnapshot.role_matches.slice(0, 3).map((role: any, i: number) => {
              const rr = readinessMap[role.role_id] || {};
              const readinessScore = role.readiness_score ?? rr.readiness_score;
              const readinessStatus = role.readiness_status ?? rr.status ?? "DEVELOPING";
              return (
                <div key={role.role_id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 14px",
                  background: "var(--bg-elevated)",
                  border: `1px solid ${i === 0 ? "var(--border-violet)" : "var(--border)"}`,
                  borderRadius: 9,
                }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", width: 22 }}>#{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{role.role_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Role Alignment: <span style={{ color: "var(--violet)", fontWeight: 700 }}>{formatPercent(role.match_score)}</span>
                      &nbsp;·&nbsp;
                      Current Readiness: <span style={{ color: readinessScore > 70 ? "var(--emerald)" : readinessScore > 45 ? "var(--blue)" : "var(--amber)", fontWeight: 700 }}>
                        {formatReadiness(readinessScore)}
                      </span>
                    </div>
                  </div>
                  <div className={`mi-badge ${readinessStatus === "READY" ? "mi-badge-emerald" : readinessStatus === "DEVELOPING" ? "mi-badge-blue" : "mi-badge-amber"}`}>
                    {readinessStatus}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mi-panel" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Diagnosis not generated yet</div>
          <p style={{ fontSize: 12, margin: "0 0 16px" }}>
            Complete the required evidence stages (Assessment, Case, Interview) to generate capability diagnosis.
          </p>
          <Link href={nextAction.href} className="mi-btn mi-btn-ghost">
            {nextAction.buttonText}
          </Link>
        </div>
      )}
    </div>
  );
}
