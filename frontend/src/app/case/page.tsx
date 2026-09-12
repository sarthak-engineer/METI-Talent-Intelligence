"use client";
import { API_BASE_URL } from "@/app/utils/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CaseDef {
  case_id: string;
  title: string;
  role_id: string;
  scenario: string;
  instructions: string;
}

export default function CasePage() {
  const router = useRouter();
  const [caseDef, setCaseDef] = useState<CaseDef | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [targetPathway, setTargetPathway] = useState("role-ai-transformation-consultant");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attemptId, setAttemptId] = useState("");
  const [error, setError] = useState("");
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  useEffect(() => {
    const cid = localStorage.getItem("candidate_id");
    const pathway = localStorage.getItem("target_pathway") || "role-ai-transformation-consultant";

    if (!cid) {
      setCandidateId(null);
      setLoading(false);
      return;
    }

    setCandidateId(cid);
    setTargetPathway(pathway);

    // Check if case evidence already exists for candidate
    fetch(`${API_BASE_URL}/api/evidence/${cid}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const items = Array.isArray(data) ? data : data.evidence ?? [];
        const hasCase = items.some(
          (e: any) => (e.evidence_type || "").toLowerCase().includes("case")
        );
        if (hasCase) {
          setAlreadyCompleted(true);
        }
      })
      .catch(() => {});

    loadCase(pathway, cid);
  }, []);

  const loadCase = async (pathway: string, cid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/case/?pathway=${pathway}`);
      if (!res.ok) throw new Error("Failed to load case definition");
      const cDef = await res.json();
      setCaseDef(cDef);
      if (cDef && cid) {
        handleStartAttempt(cid, cDef.case_id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAttempt = async (cid: string, caseId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/case/attempts?candidate_id=${cid}&case_id=${caseId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start case attempt");
      const data = await res.json();
      setAttemptId(data.attempt_id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    if (response.length < 20) { setError("Response must be at least 20 characters."); return; }
    if (!attemptId) { setError("No active case attempt."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/case/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_response: response }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Submission failed");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const wordCount = response.trim().split(/\s+/).filter(Boolean).length;
  const charCount = response.length;
  const pathwayLabel = targetPathway.replace("role-", "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // ─── NO CANDIDATE PREREQUISITE GUARD ───
  if (!candidateId && !loading) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 640 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">PREREQUISITE REQUIRED</div>
          <h1 className="mi-page-title">Candidate Profile Required</h1>
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

  // ─── ALREADY COMPLETED VIEW ───
  if (alreadyCompleted && !submitted) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 600 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">CONSULTING CASE</div>
          <h1 className="mi-page-title">Case Completed</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: 28, color: "var(--emerald)",
          }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Consulting Case Work Sample Recorded
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, maxWidth: 460, margin: "0 auto 24px" }}>
            Your consulting case work sample has already been recorded as evidence for <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{candidateId}</span>. Proceed to the next stage in your METI journey.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="mi-btn mi-btn-ghost" onClick={() => setAlreadyCompleted(false)}>
              Re-submit Case
            </button>
            <Link href="/interview" className="mi-btn mi-btn-primary">
              Start Structured Interview →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mi-loading-screen">
        <div className="mi-loading-card">
          <div className="mi-loader" />
          <div>
            <div className="mi-loading-title">Loading Case</div>
            <div className="mi-loading-sub">Retrieving consulting case scenario…</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !caseDef) {
    return (
      <div className="mi-loading-screen">
        <div className="mi-error-card">
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
          <h1>Case Unavailable</h1>
          <p>{error}</p>
          <button className="mi-btn mi-btn-primary" style={{ marginTop: 16 }} onClick={() => loadCase(targetPathway, candidateId!)}>Retry</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 600 }}>
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: 28, color: "var(--emerald)",
          }}>✓</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Case Complete</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>
            Your submission has been recorded and creates a <strong style={{ color: "var(--violet)" }}>CASE_WORK_SAMPLE</strong> evidence record.
          </p>
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 32 }}>
            This evidence contributes to your consulting capability diagnosis.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/interview" className="mi-btn mi-btn-primary" style={{ fontSize: 14, padding: "12px 28px" }}>
              Start Structured Interview →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Page header */}
      <div style={{ padding: "28px 36px 0", borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        <div style={{ maxWidth: 900 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="mi-eyebrow">CONSULTING CASE ASSESSMENT ({candidateId})</div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: "4px 0 2px", letterSpacing: "-0.02em" }}>
                {caseDef?.title ?? "Loading…"}
              </h1>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Pathway: <span style={{ color: "var(--violet)", fontWeight: 600 }}>{pathwayLabel}</span>
                &nbsp;·&nbsp;Case ID: <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{caseDef?.case_id}</span>
              </div>
            </div>
            <span className="mi-badge mi-badge-violet">Work Sample</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 36px" }}>
        <div style={{ maxWidth: 900, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, alignItems: "start" }}>

          {/* Left: Case brief */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="mi-panel-glow-violet">
              <div className="mi-eyebrow" style={{ marginBottom: 8 }}>CLIENT CONTEXT</div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                {caseDef?.scenario}
              </p>
            </div>

            <div className="mi-panel">
              <div className="mi-eyebrow" style={{ marginBottom: 8 }}>DELIVERABLE</div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                {caseDef?.instructions}
              </p>
            </div>

            <div className="mi-panel" style={{ background: "var(--amber-dim)", borderColor: "rgba(245,158,11,0.25)" }}>
              <div className="mi-eyebrow" style={{ marginBottom: 6, color: "var(--amber)" }}>EVIDENCE NOTE</div>
              <p style={{ fontSize: 12, color: "var(--amber)", margin: 0, lineHeight: 1.5 }}>
                Submission creates a <strong>CASE_WORK_SAMPLE</strong> evidence record with confidence 0.85.
              </p>
            </div>
          </div>

          {/* Right: Response workspace */}
          <div>
            <div className="mi-panel-glow-blue">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="mi-eyebrow">YOUR RESPONSE</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)" }}>
                  {wordCount} words · {charCount} chars
                </div>
              </div>
              <textarea
                className="mi-textarea"
                rows={18}
                placeholder="Structure your consulting response here. Demonstrate your analytical approach, recommendations, and supporting rationale…"
                value={response}
                onChange={(e) => { setResponse(e.target.value); setError(""); }}
              />
              {error && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 12, color: "var(--red)" }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "14px 36px", borderTop: "1px solid var(--border)",
        background: "var(--sidebar-bg)", display: "flex",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
          {response.length < 20
            ? `${20 - response.length} more characters required`
            : <span style={{ color: "var(--emerald)" }}>✓ Minimum length met</span>}
        </div>
        <button
          className="mi-btn mi-btn-primary"
          onClick={handleSubmit}
          disabled={submitting || response.length < 20 || !attemptId}
        >
          {submitting ? "Submitting…" : "Submit Case →"}
        </button>
      </div>
    </div>
  );
}
