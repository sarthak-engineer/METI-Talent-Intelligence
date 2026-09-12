"use client";
import { API_BASE_URL } from "@/app/utils/api";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [yearsExp, setYearsExp] = useState("5");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("Technology Consulting");
  const [pathway, setPathway] = useState("role-ai-transformation-consultant");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [existingCandidateId, setExistingCandidateId] = useState<string | null>(null);

  useEffect(() => {
    const cid = localStorage.getItem("candidate_id");
    const cname = localStorage.getItem("candidate_name");
    const cemail = localStorage.getItem("candidate_email");
    const cpath = localStorage.getItem("target_pathway");
    if (cid) setExistingCandidateId(cid);
    if (cname) setName(cname);
    if (cemail) setEmail(cemail);
    if (cpath) setPathway(cpath);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Full name is required."); return; }
    if (!email.trim()) { setError("Email address is required."); return; }

    setSubmitting(true);
    setError("");

    // Reuse existing candidate ID or generate a stable unique ID
    let candidateId = existingCandidateId;
    if (!candidateId) {
      const cleanSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 16);
      candidateId = `cand-${cleanSlug || "user"}-${Math.random().toString(36).slice(2, 6)}`;
    }

    try {
      setUploadStatus("Persisting candidate profile...");

      // 1. Persist candidate record to backend
      const candRes = await fetch(`${API_BASE_URL}/api/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          full_name: name.trim(),
          email: email.trim(),
          current_role: currentRole.trim(),
          years_experience: Number(yearsExp) || 0,
          location: location.trim(),
          industry: industry.trim(),
          target_pathway: pathway,
        }),
      });

      if (!candRes.ok) {
        const d = await candRes.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to create candidate record.");
      }

      // 2. Save active session to localStorage
      localStorage.setItem("candidate_id", candidateId);
      localStorage.setItem("candidate_name", name.trim());
      localStorage.setItem("candidate_email", email.trim());
      localStorage.setItem("target_pathway", pathway);
      setExistingCandidateId(candidateId);

      // 3. Navigate to Resume Upload (next step in journey)
      router.push("/resume");
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mi-page-inner" style={{ maxWidth: 680 }}>
      <div className="mi-page-header">
        <div className="mi-eyebrow">STEP 1 OF 9 · CANDIDATE ONBOARDING</div>
        <h1 className="mi-page-title">Candidate Profile</h1>
        <p className="mi-page-subtitle">
          Create your candidate profile and select your target consulting pathway. Your resume will be uploaded in the next step.
        </p>
      </div>

      {existingCandidateId && (
        <div className="mi-panel-sm" style={{ marginBottom: 16, borderColor: "var(--border-blue)", background: "rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--blue)", fontWeight: 700 }}>ACTIVE CANDIDATE IDENTITY</div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{name} ({existingCandidateId})</div>
          </div>
          <button
            type="button"
            className="mi-btn mi-btn-ghost"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => {
              localStorage.removeItem("candidate_id");
              localStorage.removeItem("candidate_name");
              localStorage.removeItem("candidate_email");
              localStorage.removeItem("target_pathway");
              setExistingCandidateId(null);
              setName("");
              setEmail("");
              setCurrentRole("");
              setLocation("");
              setIndustry("Technology Consulting");
              setPathway("role-ai-transformation-consultant");
            }}
          >
            Start New Candidate
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mi-panel">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label className="mi-eyebrow" style={{ display: "block", marginBottom: 6 }}>Full Name *</label>
            <input
              type="text"
              className="mi-input"
              placeholder="e.g. Alex Mercer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mi-eyebrow" style={{ display: "block", marginBottom: 6 }}>Email Address *</label>
            <input
              type="email"
              className="mi-input"
              placeholder="alex.mercer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label className="mi-eyebrow" style={{ display: "block", marginBottom: 6 }}>Current / Most Recent Role</label>
            <input
              type="text"
              className="mi-input"
              placeholder="e.g. Senior Technology Specialist"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
            />
          </div>
          <div>
            <label className="mi-eyebrow" style={{ display: "block", marginBottom: 6 }}>Years of Experience</label>
            <input
              type="number"
              className="mi-input"
              min="0"
              max="40"
              value={yearsExp}
              onChange={(e) => setYearsExp(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label className="mi-eyebrow" style={{ display: "block", marginBottom: 6 }}>Location</label>
            <input
              type="text"
              className="mi-input"
              placeholder="e.g. London, UK"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <label className="mi-eyebrow" style={{ display: "block", marginBottom: 6 }}>Industry Domain</label>
            <input
              type="text"
              className="mi-input"
              placeholder="e.g. Financial Services"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="mi-eyebrow" style={{ display: "block", marginBottom: 6 }}>Target Consulting Pathway *</label>
          <select className="mi-select" style={{ width: "100%" }} value={pathway} onChange={(e) => setPathway(e.target.value)}>
            <option value="role-ai-transformation-consultant">AI Transformation Consultant</option>
            <option value="role-ai-ml-consultant">AI / ML Consultant</option>
            <option value="role-business-technology-consultant">Business / Technology Consultant</option>
          </select>
        </div>

        {uploadStatus && (
          <div style={{ padding: "10px 14px", background: "var(--blue-dim)", border: "1px solid var(--border-blue)", borderRadius: 8, fontSize: 12, color: "var(--blue)", marginBottom: 16 }}>
            {uploadStatus}
          </div>
        )}

        {error && (
          <div style={{ padding: "10px 14px", background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "var(--red)", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" className="mi-btn mi-btn-primary" style={{ flex: 1, padding: "12px" }} disabled={submitting}>
            {submitting ? "Saving Candidate Profile…" : "Save Profile & Continue to Resume Upload →"}
          </button>
        </div>
      </form>
    </div>
  );
}
