"use client";
import { API_BASE_URL } from "@/app/utils/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Option = { id: string; text: string };
type QuestionType = "single_choice" | "scenario" | "free_text" | "ranked";
type Question = {
  id: string;
  question: string;
  question_type: QuestionType;
  required: boolean;
  estimated_minutes: number;
  options?: Option[];
};
type Status = "loading" | "no_candidate" | "already_completed" | "intro" | "loading_attempt" | "questions" | "review" | "submitting" | "complete" | "error";

const PATHWAYS = [
  { id: "role-ai-transformation-consultant", label: "AI Transformation Consultant" },
  { id: "role-ai-ml-consultant",             label: "AI / ML Consultant" },
  { id: "role-business-technology-consultant", label: "Business / Technology Consultant" },
];

const TYPE_COLORS: Record<string, string> = {
  single_choice: "mi-badge-blue",
  scenario:      "mi-badge-violet",
  free_text:     "mi-badge-cyan",
  ranked:        "mi-badge-amber",
};

export default function AssessmentPage() {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evidenceCreatedCount, setEvidenceCreatedCount] = useState(0);
  const [targetPathway, setTargetPathway] = useState("role-ai-transformation-consultant");

  useEffect(() => {
    const cid = localStorage.getItem("candidate_id");
    const cname = localStorage.getItem("candidate_name");
    const pathway = localStorage.getItem("target_pathway") || "role-ai-transformation-consultant";

    if (!cid) {
      setCandidateId(null);
      setStatus("no_candidate");
      return;
    }

    setCandidateId(cid);
    setCandidateName(cname);
    setTargetPathway(pathway);

    checkExistingAndLoadQuestions(cid, pathway);
  }, []);

  async function checkExistingAndLoadQuestions(cid: string, pathway: string) {
    try {
      setStatus("loading");

      // Check if attempt/evidence already completed for this candidate
      const [attRes, qRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/assessment/attempts/candidate/${cid}`).catch(() => null),
        fetch(`${API_BASE_URL}/api/assessment/questions?candidate_id=${cid}&target_pathway=${pathway}`).catch(() => null),
      ]);

      if (attRes && attRes.ok) {
        const attempts = await attRes.json();
        if (Array.isArray(attempts) && attempts.some((a) => a.status === "completed")) {
          setStatus("already_completed");
          return;
        }
      }

      if (qRes && qRes.ok) {
        setQuestions(await qRes.json());
        setStatus("intro");
      } else {
        throw new Error("Failed to load assessment questions");
      }
    } catch {
      setErrorMessage("Could not connect to the assessment service.");
      setStatus("error");
    }
  }

  async function handleStart() {
    if (!candidateId) return;
    try {
      setStatus("loading_attempt");
      const res = await fetch(`${API_BASE_URL}/api/assessment/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidateId }),
      });
      if (!res.ok) throw new Error("Failed to create attempt");
      const data = await res.json();
      setAttemptId(data.attempt_id);
      const init: Record<string, any> = {};
      questions.forEach((q) => {
        if (q.question_type === "ranked" && q.options) init[q.id] = q.options.map((o) => o.id);
      });
      setResponses(init);
      setStatus("questions");
      setCurrentIndex(0);
    } catch {
      setErrorMessage("Failed to start the assessment.");
      setStatus("error");
    }
  }

  async function handleSubmit() {
    if (!attemptId || !candidateId) return;
    try {
      setStatus("submitting");
      const res = await fetch(`${API_BASE_URL}/api/assessment/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          target_pathway: targetPathway,
          responses: Object.entries(responses).map(([question_id, response]) => ({ question_id, response })),
        }),
      });
      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      setEvidenceCreatedCount(data.evidence_created_count || 0);
      setStatus("complete");
    } catch {
      setErrorMessage("Failed to submit assessment. Please try again.");
      setStatus("error");
    }
  }

  const handleResponseChange = (id: string, value: any) =>
    setResponses((p) => ({ ...p, [id]: value }));

  const isResponseValid = (q: Question) => {
    if (!q.required) return true;
    const r = responses[q.id];
    if (q.question_type === "single_choice") return !!r;
    if (q.question_type === "scenario" || q.question_type === "free_text")
      return typeof r === "string" && r.trim().length > 0;
    if (q.question_type === "ranked")
      return Array.isArray(r) && r.length === (q.options?.length || 0);
    return false;
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
    else setStatus("review");
  };

  const handlePrevious = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  const moveRankedItem = (index: number, direction: -1 | 1) => {
    const arr = [...(responses[questions[currentIndex].id] || [])];
    if (index + direction < 0 || index + direction >= arr.length) return;
    [arr[index], arr[index + direction]] = [arr[index + direction], arr[index]];
    handleResponseChange(questions[currentIndex].id, arr);
  };

  const q = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const pathwayLabel = PATHWAYS.find((p) => p.id === targetPathway)?.label ?? targetPathway;

  // ─── NO CANDIDATE PREREQUISITE GUARD ───
  if (status === "no_candidate") {
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
            Please complete candidate onboarding first to setup your identity and target consulting pathway.
          </p>
          <Link href="/onboarding" className="mi-btn mi-btn-primary">
            Complete Profile First →
          </Link>
        </div>
      </div>
    );
  }

  // ─── ALREADY COMPLETED GUARD ───
  if (status === "already_completed") {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 640 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">DIAGNOSTIC ASSESSMENT</div>
          <h1 className="mi-page-title">Assessment Completed</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: 28, color: "var(--emerald)",
          }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Diagnostic Assessment Complete
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, maxWidth: 460, margin: "0 auto 24px" }}>
            You have already completed the diagnostic assessment for <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{candidateName || candidateId}</span>. Proceed to the next stage in your METI journey.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="mi-btn mi-btn-ghost" onClick={() => checkExistingAndLoadQuestions(candidateId!, targetPathway)}>
              Retake Assessment
            </button>
            <Link href="/case" className="mi-btn mi-btn-primary">
              Start Consulting Case →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── LOADING ───
  if (status === "loading" || status === "loading_attempt" || status === "submitting") {
    return (
      <div className="mi-loading-screen">
        <div className="mi-loading-card">
          <div className="mi-loader" />
          <div>
            <div className="mi-loading-title">
              {status === "loading" && "Loading Assessment"}
              {status === "loading_attempt" && "Preparing Environment"}
              {status === "submitting" && "Analysing Responses"}
            </div>
            <div className="mi-loading-sub">
              {status === "submitting" ? "Building evidence from your responses..." : "Please wait..."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── ERROR ───
  if (status === "error") {
    return (
      <div className="mi-loading-screen">
        <div className="mi-error-card">
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
          <h1>Assessment Error</h1>
          <p>{errorMessage}</p>
          <button className="mi-btn mi-btn-primary" style={{ marginTop: 16 }} onClick={() => checkExistingAndLoadQuestions(candidateId!, targetPathway)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── INTRO ───
  if (status === "intro") {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 720 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">DIAGNOSTIC ASSESSMENT ({candidateName || candidateId})</div>
          <h1 className="mi-page-title">METI Consulting Capability Diagnostic</h1>
          <p className="mi-page-subtitle">Evidence-based assessment of your consulting capabilities across {questions.length} targeted questions.</p>
        </div>

        {/* Pathway selector */}
        <div className="mi-panel" style={{ marginBottom: 16 }}>
          <div className="mi-eyebrow" style={{ marginBottom: 8 }}>TARGET PATHWAY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PATHWAYS.map((p) => (
              <label key={p.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 8,
                border: `1px solid ${targetPathway === p.id ? "var(--border-blue)" : "var(--border)"}`,
                background: targetPathway === p.id ? "var(--bg-active)" : "var(--bg-elevated)",
                cursor: "pointer", transition: "all 0.12s",
              }}>
                <input
                  type="radio"
                  name="pathway"
                  value={p.id}
                  checked={targetPathway === p.id}
                  onChange={() => setTargetPathway(p.id)}
                  style={{ accentColor: "var(--blue)" }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: targetPathway === p.id ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  {p.label}
                </span>
                {targetPathway === p.id && <span className="mi-badge mi-badge-blue" style={{ marginLeft: "auto" }}>Selected</span>}
              </label>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mi-panel" style={{ marginBottom: 20, borderColor: "var(--border-blue)", background: "rgba(59,130,246,0.04)" }}>
          <div className="mi-eyebrow" style={{ marginBottom: 10 }}>WHAT TO EXPECT</div>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
            <li>{questions.length} adaptive questions selected for your target pathway</li>
            <li>Scenario-based, written response, and prioritisation questions</li>
            <li>Responses are converted into structured evidence for your capability diagnosis</li>
            <li>Estimated completion: ~15 minutes</li>
          </ul>
        </div>

        <button className="mi-btn mi-btn-primary" style={{ fontSize: 14, padding: "12px 28px" }} onClick={handleStart}>
          Start Assessment →
        </button>
      </div>
    );
  }

  // ─── COMPLETE ───
  if (status === "complete") {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 600 }}>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: "50%",
            background: "var(--emerald-dim)",
            border: "1px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 28, color: "var(--emerald)",
          }}>✓</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Assessment Complete</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32 }}>
            Your responses have been converted into evidence for your METI capability diagnosis.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 40, marginBottom: 32 }}>
            <div className="mi-panel" style={{ minWidth: 120, textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)" }}>{Object.keys(responses).length}</div>
              <div className="mi-eyebrow" style={{ marginTop: 4 }}>Responses</div>
            </div>
            <div className="mi-panel" style={{ minWidth: 120, textAlign: "center", borderColor: "var(--border-blue)" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--blue)" }}>{evidenceCreatedCount}</div>
              <div className="mi-eyebrow" style={{ marginTop: 4 }}>Evidence Records</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/case" className="mi-btn mi-btn-primary" style={{ fontSize: 14, padding: "12px 28px" }}>
              Start Consulting Case →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── REVIEW ───
  if (status === "review") {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 760 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">REVIEW</div>
          <h1 className="mi-page-title">Review Your Responses</h1>
        </div>
        <div className="mi-panel" style={{ marginBottom: 20 }}>
          {questions.map((qItem, idx) => {
            const answered = isResponseValid(qItem);
            return (
              <div key={qItem.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: idx < questions.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", marginBottom: 3 }}>Q{idx + 1}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 480 }}>{qItem.question}</div>
                </div>
                <span className={`mi-badge ${answered ? "mi-badge-emerald" : "mi-badge-red"}`}>
                  {answered ? "Answered" : "Incomplete"}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="mi-btn mi-btn-ghost" onClick={() => setStatus("questions")}>← Back</button>
          <button className="mi-btn mi-btn-primary" onClick={handleSubmit}>Submit Assessment</button>
        </div>
      </div>
    );
  }

  // ─── QUESTIONS ───
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "calc(100vh - 0px)" }}>
      {/* Progress header */}
      <div style={{
        padding: "16px 36px 0",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-base)",
      }}>
        <div style={{ maxWidth: 760, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div className="mi-eyebrow" style={{ marginBottom: 2 }}>METI DIAGNOSTIC</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {pathwayLabel} · Question {currentIndex + 1} of {questions.length}
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>
            {Math.round(progress)}% complete
          </div>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden", maxWidth: 760, marginBottom: -1 }}>
          <div style={{ height: "100%", background: "var(--blue)", borderRadius: 99, width: `${progress}%`, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 36px" }}>
        <div style={{ maxWidth: 760 }}>
          {/* Question card */}
          <div className="mi-panel-glow-blue" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.4, flex: 1 }}>
                {q.question}
              </h2>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <span className={`mi-badge ${TYPE_COLORS[q.question_type] || "mi-badge-muted"}`}>
                  {q.question_type.replace("_", " ")}
                </span>
                <span className="mi-badge mi-badge-muted">⏱ {q.estimated_minutes}m</span>
              </div>
            </div>

            {/* Single choice */}
            {q.question_type === "single_choice" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options?.map((opt) => (
                  <label key={opt.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 8,
                    border: `1px solid ${responses[q.id] === opt.id ? "var(--border-blue)" : "var(--border)"}`,
                    background: responses[q.id] === opt.id ? "var(--bg-active)" : "var(--bg-elevated)",
                    cursor: "pointer",
                  }}>
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={opt.id}
                      checked={responses[q.id] === opt.id}
                      onChange={(e) => handleResponseChange(q.id, e.target.value)}
                      style={{ accentColor: "var(--blue)" }}
                    />
                    <span style={{ fontSize: 13, color: responses[q.id] === opt.id ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {opt.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Text / scenario */}
            {(q.question_type === "scenario" || q.question_type === "free_text") && (
              <textarea
                className="mi-textarea"
                rows={8}
                placeholder="Type your response here…"
                value={responses[q.id] || ""}
                onChange={(e) => handleResponseChange(q.id, e.target.value)}
              />
            )}

            {/* Ranked */}
            {q.question_type === "ranked" && (
              <div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 10 }}>Order from most important (top) to least important (bottom)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(responses[q.id] || []).map((optId: string, idx: number) => {
                    const opt = q.options?.find((o) => o.id === optId);
                    if (!opt) return null;
                    return (
                      <div key={opt.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-elevated)",
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <button onClick={() => moveRankedItem(idx, -1)} disabled={idx === 0}
                            style={{ background: "none", border: "none", color: idx === 0 ? "var(--text-faint)" : "var(--blue)", cursor: idx === 0 ? "default" : "pointer", fontSize: 10 }}>▲</button>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", textAlign: "center" }}>{idx + 1}</span>
                          <button onClick={() => moveRankedItem(idx, 1)} disabled={idx === (responses[q.id]?.length ?? 0) - 1}
                            style={{ background: "none", border: "none", color: idx === (responses[q.id]?.length ?? 0) - 1 ? "var(--text-faint)" : "var(--blue)", cursor: idx === (responses[q.id]?.length ?? 0) - 1 ? "default" : "pointer", fontSize: 10 }}>▼</button>
                        </div>
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div style={{
        padding: "14px 36px",
        borderTop: "1px solid var(--border)",
        background: "var(--sidebar-bg)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ maxWidth: 760, width: "100%", display: "flex", justifyContent: "space-between", margin: "0 auto" }}>
          <button className="mi-btn mi-btn-ghost" onClick={handlePrevious} disabled={currentIndex === 0}>
            ← Previous
          </button>
          <button
            className="mi-btn mi-btn-primary"
            onClick={handleNext}
            disabled={!isResponseValid(q)}
          >
            {currentIndex === questions.length - 1 ? "Review →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
