"use client";
import { API_BASE_URL } from "@/app/utils/api";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResumeUploadPage() {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [evidenceCount, setEvidenceCount] = useState<number>(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const cid = localStorage.getItem("candidate_id");
    const cname = localStorage.getItem("candidate_name");

    if (!cid) {
      setCandidateId(null);
      setLoading(false);
      return;
    }

    setCandidateId(cid);
    setCandidateName(cname);

    // Check if resume evidence already exists for this candidate
    fetch(`${API_BASE_URL}/api/evidence/${cid}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const items = Array.isArray(data) ? data : data.evidence ?? [];
          const resumeItems = items.filter(
            (e: any) =>
              (e.evidence_type || "").toLowerCase().includes("resume") ||
              (e.evidence_type || "").toLowerCase().includes("self_report") ||
              (e.source || "").toLowerCase().includes("resume")
          );
          if (resumeItems.length > 0) {
            setUploadComplete(true);
            setEvidenceCount(resumeItems.length);
            setUploadedFilename("Previously uploaded resume");
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setError("");
  };

  const handleUpload = async () => {
    if (!candidateId || !selectedFile) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(
        `${API_BASE_URL}/api/resume/upload?candidate_id=${candidateId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to upload resume.");
      }

      const data = await res.json();
      setUploadComplete(true);
      setUploadedFilename(selectedFile.name);
      setEvidenceCount(data.evidence_count || 0);
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── No candidate session ──
  if (!loading && !candidateId) {
    return (
      <div className="mi-page-inner" style={{ maxWidth: 640 }}>
        <div className="mi-page-header">
          <div className="mi-eyebrow">PREREQUISITE REQUIRED</div>
          <h1 className="mi-page-title">Profile Required</h1>
        </div>
        <div className="mi-panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>👤</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            No Active Candidate Session
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 20,
              maxWidth: 440,
              margin: "0 auto 20px",
            }}
          >
            Please complete candidate onboarding first to create your profile
            before uploading a resume.
          </p>
          <Link href="/onboarding" className="mi-btn mi-btn-primary">
            Complete Profile First →
          </Link>
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
            <div className="mi-loading-title">Loading Resume</div>
            <div className="mi-loading-sub">
              Checking resume status for candidate...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mi-page-inner" style={{ maxWidth: 680 }}>
      {/* Header */}
      <div className="mi-page-header">
        <div className="mi-eyebrow">
          STEP 2 OF 9 · RESUME UPLOAD ({candidateName || candidateId})
        </div>
        <h1 className="mi-page-title">Upload Your Resume</h1>
        <p className="mi-page-subtitle">
          Your resume is the first evidence source used to understand your
          experience and generate grounded verification questions during the
          structured interview.
        </p>
      </div>

      {/* Upload Card */}
      <div className="mi-panel" style={{ marginBottom: 24 }}>
        {!uploadComplete ? (
          <>
            {/* File selection area */}
            <div
              style={{
                padding: "40px 24px",
                border: "2px dashed var(--border-blue)",
                borderRadius: 12,
                background: "rgba(59,130,246,0.04)",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  marginBottom: 12,
                  color: "var(--blue)",
                }}
              >
                📄
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                {selectedFile
                  ? selectedFile.name
                  : "Choose your resume file"}
              </div>

              {selectedFile && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 12,
                  }}
                >
                  {(selectedFile.size / 1024).toFixed(1)} KB ·{" "}
                  {selectedFile.name.split(".").pop()?.toUpperCase()}
                </div>
              )}

              <label
                htmlFor="resume-file-input"
                className="mi-btn mi-btn-ghost"
                style={{
                  cursor: "pointer",
                  display: "inline-block",
                  padding: "10px 24px",
                }}
              >
                {selectedFile ? "Change File" : "Choose Resume"}
              </label>
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />

              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-faint)",
                  marginTop: 12,
                }}
              >
                Supported formats: PDF, DOCX, TXT · Max 10 MB
              </div>
            </div>

            {/* Upload button */}
            <button
              className="mi-btn mi-btn-primary"
              style={{ width: "100%", padding: "14px", fontSize: 14 }}
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading
                ? "Uploading & Parsing Resume..."
                : "Upload Resume"}
            </button>
          </>
        ) : (
          <>
            {/* Success state */}
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--emerald-dim)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 28,
                  color: "var(--emerald)",
                }}
              >
                ✓
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                Resume Uploaded Successfully
              </div>

              {/* Details */}
              <div
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  gap: 8,
                  textAlign: "left",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 20px",
                  marginTop: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                    Filename:
                  </span>{" "}
                  <span style={{ color: "var(--blue)" }}>{uploadedFilename}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                    Processing:
                  </span>{" "}
                  <span style={{ color: "var(--emerald)" }}>Completed</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                    Evidence Extracted:
                  </span>{" "}
                  <span style={{ color: "var(--blue)", fontWeight: 700 }}>
                    {evidenceCount} item(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Continue to Assessment */}
            <button
              className="mi-btn mi-btn-primary"
              style={{ width: "100%", padding: "14px", fontSize: 14 }}
              onClick={() => router.push("/assessment")}
            >
              Continue to Assessment →
            </button>

            {/* Upload a different resume */}
            <button
              className="mi-btn mi-btn-ghost"
              style={{ width: "100%", padding: "10px", fontSize: 12, marginTop: 8 }}
              onClick={() => {
                setUploadComplete(false);
                setSelectedFile(null);
                setUploadedFilename(null);
              }}
            >
              Upload a Different Resume
            </button>
          </>
        )}

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              background: "var(--red-dim)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--red)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Info panel */}
      <div
        className="mi-panel"
        style={{
          borderColor: "var(--border-blue)",
          background: "rgba(59,130,246,0.04)",
        }}
      >
        <div className="mi-eyebrow" style={{ marginBottom: 10, color: "var(--blue)" }}>
          WHY UPLOAD A RESUME?
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          <li>
            Your resume is parsed into structured claims about your experience,
            skills, and qualifications.
          </li>
          <li>
            These claims become verifiable evidence in the METI framework
            with initial confidence scores.
          </li>
          <li>
            The structured interview will verify and challenge resume claims
            to establish true confidence levels.
          </li>
          <li>
            All evidence feeds into the deterministic CCI scoring engine for
            transparent capability diagnosis.
          </li>
        </ul>
      </div>
    </div>
  );
}
