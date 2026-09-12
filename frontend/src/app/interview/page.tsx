"use client";
import { API_BASE_URL } from "@/app/utils/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COMP_NAMES: Record<string, string> = {
  C01: "Strategy & Enterprise Thinking",
  C02: "Research & Insight",
  C03: "Value Chain & Enterprise Analysis",
  C04: "Process / Capability / TOM",
  C05: "Transformation & Change",
  C06: "Organisation & Governance",
  C07: "Programme / Portfolio / Benefits",
  C08: "Enterprise AI Transformation",
  C09: "Problem Structuring & Commercial Thinking",
  C10: "Executive Communication — Written",
  C11: "Executive Communication — Video",
  C12: "Stakeholder / Facilitation",
  C13: "Professional Judgement",
  C14: "Learning Agility / Adaptability",
};

interface InterviewQuestion {
  question_id: string;
  category: string;
  competency_ids: string[];
  reason: string;
  evidence_to_verify: string;
  source_evidence_ids?: string[];
  expected_signal: string;
  question: string;
}

interface InterviewAttempt {
  interview_id: string;
  candidate_id: string;
  pathway: string;
  status: string;
  question_count: number;
  questions: InterviewQuestion[];
}

export default function InterviewPage() {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [targetPathway, setTargetPathway] = useState("role-ai-transformation-consultant");
  const [attempt, setAttempt] = useState<InterviewAttempt | null>(null);
  const [starting, setStarting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cid = localStorage.getItem("candidate_id");
    const pathway = localStorage.getItem("target_pathway") || "role-ai-transformation-consultant";

    if (!cid) {
      setCandidateId(null);
      return;
    }

    setCandidateId(cid);
    setTargetPathway(pathway);

    // Check if interview evidence already exists
    fetch(`${API_BASE_URL}/api/evidence/${cid}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const items = Array.isArray(data) ? data : data.evidence ?? [];
        const hasInterview = items.some(
          (e: any) =>
            (e.evidence_type || "").toLowerCase().includes("interview") ||
            (e.evidence_type || "").toLowerCase().includes("consulting_response")
        );
        if (hasInterview) {
          setAlreadyCompleted(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleStart = async () => {
    if (!candidateId) return;
    setStarting(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/interview/attempts?candidate_id=${candidateId}&pathway=${targetPathway}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to start interview");
      const data = await res.json();
      setAttempt(data);
      setCurrentIndex(0);
      setAnswer("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (answer.trim().length < 10) { setError("Please provide a more detailed answer."); return; }
    if (!attempt) return;
    const q = attempt.questions[currentIndex];
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/interview/attempts/${attempt.interview_id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question_id: q.question_id, answer }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Submission failed");
      }
      const data = await res.json();
      if (data.status === "completed") {
        setCompleted(true);
      } else {
        setAnswer("");
        setCurrentIndex((p) => p + 1);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pathwayLabel = targetPathway.replace("role-", "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const progress = attempt ? ((currentIndex + 1) / attempt.question_count) * 100 : 0;
  const q = attempt?.questions[currentIndex];

  // ─── NO CANDIDATE PREREQUISITE GUARD ───
  if (!candidateId) {
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

  // ─── ALREADY COMPLETED GUARD ───
  if (alreadyCompleted && !completed && !attempt) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 600 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">STRUCTURED INTERVIEW</div>
          <h1 className="mi-page-title">Interview Completed</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: 28, color: "var(--emerald)",
          }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Structured Interview Evidence Recorded
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, maxWidth: 460, margin: "0 auto 24px" }}>
            Interview responses have been recorded as evidence for <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{candidateId}</span>. Proceed to review collected evidence.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="mi-btn mi-btn-ghost" onClick={() => setAlreadyCompleted(false)}>
              Retake Interview
            </button>
            <Link href="/evidence" className="mi-btn mi-btn-primary">
              Review Collected Evidence →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── COMPLETED ───
  if (completed) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 600 }}>
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: 28, color: "var(--emerald)",
          }}>✓</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Interview Complete</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32 }}>
            All {attempt?.question_count} questions answered. Your responses have been recorded as evidence for {candidateId}.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/evidence" className="mi-btn mi-btn-primary" style={{ fontSize: 14, padding: "12px 28px" }}>
              Review Collected Evidence →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── INTRO / NOT STARTED ───
  if (!attempt) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 720 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">STRUCTURED INTERVIEW ({candidateId})</div>
          <h1 className="mi-page-title">Consulting Capability Interview</h1>
          <p className="mi-page-subtitle">
            Questions are selected based on your target pathway, existing evidence, and coverage gaps.
          </p>
        </div>

        <div className="mi-panel-glow-violet" style={{ marginBottom: 16 }}>
          <div className="mi-eyebrow" style={{ marginBottom: 10 }}>INTERVIEW CONTEXT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>Target Pathway</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--violet)" }}>{pathwayLabel}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>Candidate Identity</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                {candidateId}
              </div>
            </div>
          </div>
        </div>

        <div className="mi-panel" style={{ marginBottom: 20 }}>
          <div className="mi-eyebrow" style={{ marginBottom: 10 }}>HOW QUESTIONS ARE SELECTED</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Questions are tailored to your target pathway and current evidence state</li>
            <li>Competency coverage gaps are prioritised for investigation</li>
            <li>Existing resume, assessment, and case evidence is triangulated</li>
            <li>Each question targets specific competency signals</li>
          </ul>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "var(--red)", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          className="mi-btn mi-btn-violet"
          style={{ fontSize: 14, padding: "12px 28px" }}
          onClick={handleStart}
          disabled={starting || !candidateId}
        >
          {starting ? "Generating questions…" : "Begin Interview →"}
        </button>
      </div>
    );
  }

  // ─── QUESTION VIEW ───
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Progress header */}
      <div style={{ padding: "16px 36px 0", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 800, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div className="mi-eyebrow" style={{ marginBottom: 2 }}>STRUCTURED INTERVIEW</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {pathwayLabel} · Question {currentIndex + 1} of {attempt.question_count}
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>
            {Math.round(progress)}% complete
          </div>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden", maxWidth: 800, marginBottom: -1 }}>
          <div style={{ height: "100%", background: "var(--violet)", borderRadius: 99, width: `${progress}%`, transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 36px" }}>
        <div style={{ maxWidth: 800 }}>
          {q && (
            <>
              {/* Context card */}
              <div className="mi-panel-glow-violet" style={{ marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Question Type</div>
                    <span className={`mi-badge ${q.category === "CLAIM_VERIFICATION" ? "mi-badge-violet" : q.category === "EVIDENCE_TRIANGULATION" ? "mi-badge-cyan" : "mi-badge-amber"}`}>
                      {q.category?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Target Capability</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {q.competency_ids.map((c) => (
                        <span key={c} className="mi-badge mi-badge-blue">
                          {c} — {COMP_NAMES[c] || c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Why This Question</div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>{q.reason}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Evidence Being Verified / Triangulated</div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 6px", lineHeight: 1.55 }}>
                      {q.evidence_to_verify || "Competency probe — no prior substantive claim available."}
                    </p>
                    {q.source_evidence_ids && q.source_evidence_ids.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {q.source_evidence_ids.map((sid) => (
                          <span key={sid} className="mi-badge mi-badge-muted" style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}>
                            Source: {sid}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Question */}
              <div className="mi-panel" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px", lineHeight: 1.4 }}>
                  {q.question}
                </h2>
                <textarea
                  className="mi-textarea"
                  rows={10}
                  placeholder="Share a specific example or demonstrate your thinking…"
                  value={answer}
                  onChange={(e) => { setAnswer(e.target.value); setError(""); }}
                />
                {error && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 12, color: "var(--red)" }}>
                    {error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "14px 36px", borderTop: "1px solid var(--border)",
        background: "var(--sidebar-bg)", display: "flex",
        justifyContent: "flex-end", alignItems: "center",
      }}>
        <button
          className="mi-btn mi-btn-violet"
          onClick={handleSubmitAnswer}
          disabled={submitting || answer.trim().length < 10}
        >
          {submitting ? "Submitting…" : currentIndex < attempt.question_count - 1 ? "Next Question →" : "Complete Interview →"}
        </button>
      </div>
    </div>
  );
}
