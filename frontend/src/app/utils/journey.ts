export type JourneyStateEnum =
  | "PROFILE_INCOMPLETE"
  | "PROFILE_COMPLETE"
  | "RESUME_UPLOADED"
  | "ASSESSMENT_IN_PROGRESS"
  | "ASSESSMENT_COMPLETE"
  | "CASE_IN_PROGRESS"
  | "CASE_COMPLETE"
  | "INTERVIEW_IN_PROGRESS"
  | "INTERVIEW_COMPLETE"
  | "READY_FOR_DIAGNOSIS"
  | "DIAGNOSIS_COMPLETE"
  | "REPORT_AVAILABLE"
  | "REVIEW_REQUIRED"
  | "REVIEW_COMPLETE"
  | "REASSESSMENT_AVAILABLE";

export interface JourneyStep {
  id: string;
  name: string;
  href: string;
  status: "complete" | "available" | "locked";
  isNext: boolean;
  missingPrerequisite?: string;
}

export interface CandidateJourneyData {
  candidateId: string | null;
  candidateName: string | null;
  state: JourneyStateEnum;
  hasProfile: boolean;
  hasResume: boolean;
  hasAssessment: boolean;
  hasCase: boolean;
  hasInterview: boolean;
  hasAnalysis: boolean;
  hasReport: boolean;
  evidenceCount: number;
  attemptsCount: number;
  analysisSnapshot: any | null;
  steps: JourneyStep[];
  nextAction: {
    label: string;
    buttonText: string;
    href: string;
    description: string;
  };
}

export async function fetchCandidateJourney(
  candidateId: string | null
): Promise<CandidateJourneyData> {
  const defaultAction = {
    label: "Candidate Onboarding",
    buttonText: "Begin Onboarding →",
    href: "/onboarding",
    description: "Create candidate profile and upload resume evidence to start your capability journey.",
  };

  if (!candidateId || !candidateId.trim()) {
    return {
      candidateId: null,
      candidateName: null,
      state: "PROFILE_INCOMPLETE",
      hasProfile: false,
      hasResume: false,
      hasAssessment: false,
      hasCase: false,
      hasInterview: false,
      hasAnalysis: false,
      hasReport: false,
      evidenceCount: 0,
      attemptsCount: 0,
      analysisSnapshot: null,
      steps: buildSteps({
        hasProfile: false,
        hasResume: false,
        hasAssessment: false,
        hasCase: false,
        hasInterview: false,
        hasAnalysis: false,
        hasReport: false,
      }),
      nextAction: defaultAction,
    };
  }

  const cid = candidateId.trim();
  let candidateName: string | null = localStorage.getItem("candidate_name") || null;
  let hasProfile = false;
  let hasResume = false;
  let hasAssessment = false;
  let hasCase = false;
  let hasInterview = false;
  let hasAnalysis = false;
  let hasReport = false;
  let evidenceCount = 0;
  let attemptsCount = 0;
  let analysisSnapshot: any = null;

  try {
    const [candRes, evRes, anRes, repRes, attRes] = await Promise.all([
      fetch(`http://127.0.0.1:8000/api/candidates/${cid}`).catch(() => null),
      fetch(`http://127.0.0.1:8000/api/evidence/${cid}`).catch(() => null),
      fetch(`http://127.0.0.1:8000/api/analysis/${cid}`).catch(() => null),
      fetch(`http://127.0.0.1:8000/api/reports/${cid}`).catch(() => null),
      fetch(`http://127.0.0.1:8000/api/assessment/attempts/${cid}`).catch(() => null),
    ]);

    if (candRes && candRes.ok) {
      const cand = await candRes.json();
      hasProfile = true;
      if (cand.full_name) candidateName = cand.full_name;
    } else {
      if (typeof window !== "undefined" && candidateId) {
        localStorage.removeItem("candidate_id");
        localStorage.removeItem("candidate_name");
        localStorage.removeItem("candidate_email");
        localStorage.removeItem("target_pathway");
        candidateId = null;
        candidateName = null;
      }
    }

    if (evRes && evRes.ok) {
      const evData = await evRes.json();
      const items: any[] = Array.isArray(evData) ? evData : evData.evidence ?? evData.items ?? [];
      evidenceCount = items.length;

      const types: string[] = items.map((e) => (e.evidence_type || "").toLowerCase());
      hasResume = types.some((t) => t.includes("resume") || t.includes("self_report"));
      hasAssessment = types.some(
        (t) => t.includes("assessment") || t.includes("structured_scenario") || t.includes("diagnostic")
      );
      hasCase = types.some((t) => t.includes("case") || t.includes("case_work_sample"));
      hasInterview = types.some((t) => t.includes("interview") || t.includes("consulting_response"));
    }

    if (attRes && attRes.ok) {
      const attempts = await attRes.json();
      if (Array.isArray(attempts) && attempts.length > 0) {
        attemptsCount = attempts.length;
        if (attempts.some((a) => a.status === "completed")) {
          hasAssessment = true;
        }
      }
    }

    if (anRes && anRes.ok) {
      analysisSnapshot = await anRes.json();
      if (analysisSnapshot && analysisSnapshot.id) {
        hasAnalysis = true;
      }
    }

    if (repRes && repRes.ok) {
      const rep = await repRes.json();
      if (rep && (rep.detailed_report || rep.summary)) {
        hasReport = true;
      }
    }
  } catch (err) {
    console.error("Error evaluating candidate journey state:", err);
  }

  // Determine state enum
  let state: JourneyStateEnum = "PROFILE_COMPLETE";
  if (!hasProfile) {
    state = "PROFILE_INCOMPLETE";
  } else if (!hasResume) {
    state = "PROFILE_COMPLETE";
  } else if (!hasAssessment) {
    state = "RESUME_UPLOADED";
  } else if (!hasCase) {
    state = "ASSESSMENT_COMPLETE";
  } else if (!hasInterview) {
    state = "CASE_COMPLETE";
  } else if (!hasAnalysis) {
    state = "INTERVIEW_COMPLETE";
  } else if (!hasReport) {
    state = "DIAGNOSIS_COMPLETE";
  } else {
    state = "REPORT_AVAILABLE";
  }

  const steps = buildSteps({
    hasProfile,
    hasResume,
    hasAssessment,
    hasCase,
    hasInterview,
    hasAnalysis,
    hasReport,
  });

  const nextAction = computeNextAction({
    hasProfile,
    hasResume,
    hasAssessment,
    hasCase,
    hasInterview,
    hasAnalysis,
    hasReport,
  });

  return {
    candidateId: cid,
    candidateName,
    state,
    hasProfile,
    hasResume,
    hasAssessment,
    hasCase,
    hasInterview,
    hasAnalysis,
    hasReport,
    evidenceCount,
    attemptsCount,
    analysisSnapshot,
    steps,
    nextAction,
  };
}

function buildSteps(flags: {
  hasProfile: boolean;
  hasResume: boolean;
  hasAssessment: boolean;
  hasCase: boolean;
  hasInterview: boolean;
  hasAnalysis: boolean;
  hasReport: boolean;
}): JourneyStep[] {
  const {
    hasProfile,
    hasResume,
    hasAssessment,
    hasCase,
    hasInterview,
    hasAnalysis,
    hasReport,
  } = flags;

  // Find first incomplete step
  let nextStepId = "profile";
  if (!hasProfile) nextStepId = "profile";
  else if (!hasResume) nextStepId = "resume";
  else if (!hasAssessment) nextStepId = "assessment";
  else if (!hasCase) nextStepId = "case";
  else if (!hasInterview) nextStepId = "interview";
  else if (!hasAnalysis) nextStepId = "diagnosis";
  else if (!hasReport) nextStepId = "report";
  else nextStepId = "report";

  return [
    {
      id: "profile",
      name: "1. Profile",
      href: "/onboarding",
      status: hasProfile ? "complete" : "available",
      isNext: !hasProfile,
    },
    {
      id: "resume",
      name: "2. Resume Upload",
      href: "/resume",
      status: hasResume ? "complete" : hasProfile ? "available" : "locked",
      isNext: hasProfile && !hasResume,
      missingPrerequisite: hasProfile ? undefined : "Complete candidate profile",
    },
    {
      id: "assessment",
      name: "3. Diagnostic Assessment",
      href: "/assessment",
      status: hasAssessment ? "complete" : hasProfile ? "available" : "locked",
      isNext: hasProfile && hasResume && !hasAssessment,
      missingPrerequisite: hasProfile ? undefined : "Complete candidate profile",
    },
    {
      id: "case",
      name: "4. Consulting Case",
      href: "/case",
      status: hasCase ? "complete" : hasProfile ? "available" : "locked",
      isNext: hasAssessment && !hasCase,
      missingPrerequisite: hasProfile ? undefined : "Complete candidate profile",
    },
    {
      id: "interview",
      name: "5. Structured Interview",
      href: "/interview",
      status: hasInterview ? "complete" : hasProfile ? "available" : "locked",
      isNext: hasCase && !hasInterview,
      missingPrerequisite: hasProfile ? undefined : "Complete candidate profile",
    },
    {
      id: "evidence",
      name: "6. Evidence Explorer",
      href: "/evidence",
      status: (hasAssessment || hasInterview || hasResume) ? "available" : "locked",
      isNext: hasInterview && !hasAnalysis,
      missingPrerequisite: (hasAssessment || hasResume) ? undefined : "Complete assessment or upload resume",
    },
    {
      id: "diagnosis",
      name: "7. Capability Diagnosis",
      href: "/diagnosis",
      status: hasAnalysis ? "complete" : (hasAssessment || hasResume) ? "available" : "locked",
      isNext: false,
      missingPrerequisite: hasAssessment ? undefined : "Complete diagnostic assessment first",
    },
    {
      id: "development",
      name: "8. Development Plan",
      href: "/development",
      status: hasAnalysis ? "complete" : "locked",
      isNext: false,
      missingPrerequisite: hasAnalysis ? undefined : "Generate capability diagnosis first",
    },
    {
      id: "report",
      name: "9. Diagnosis Report",
      href: "/reports",
      status: hasReport ? "complete" : hasAnalysis ? "available" : "locked",
      isNext: hasAnalysis && !hasReport,
      missingPrerequisite: hasAnalysis ? undefined : "Generate capability diagnosis first",
    },
  ];
}

function computeNextAction(flags: {
  hasProfile: boolean;
  hasResume: boolean;
  hasAssessment: boolean;
  hasCase: boolean;
  hasInterview: boolean;
  hasAnalysis: boolean;
  hasReport: boolean;
}) {
  const {
    hasProfile,
    hasResume,
    hasAssessment,
    hasCase,
    hasInterview,
    hasAnalysis,
    hasReport,
  } = flags;

  if (!hasProfile) {
    return {
      label: "Profile Required",
      buttonText: "Complete Profile →",
      href: "/onboarding",
      description: "Setup candidate identity and target consulting pathway.",
    };
  }
  if (!hasResume) {
    return {
      label: "Resume Upload",
      buttonText: "Upload Resume →",
      href: "/resume",
      description: "Upload your resume (PDF, DOCX, TXT) to extract experience claims into verifiable evidence.",
    };
  }
  if (!hasAssessment) {
    return {
      label: "Diagnostic Assessment",
      buttonText: "Take Assessment →",
      href: "/assessment",
      description: "Complete targeted diagnostic questions for your consulting pathway.",
    };
  }
  if (!hasCase) {
    return {
      label: "Consulting Case",
      buttonText: "Start Consulting Case →",
      href: "/case",
      description: "Work through a practical consulting deliverable scenario.",
    };
  }
  if (!hasInterview) {
    return {
      label: "Structured Interview",
      buttonText: "Start Structured Interview →",
      href: "/interview",
      description: "Complete resume-grounded capability investigation interview.",
    };
  }
  if (!hasAnalysis) {
    return {
      label: "Review Evidence",
      buttonText: "Review Evidence →",
      href: "/evidence",
      description: "Inspect collected multi-source evidence before synthesizing capability diagnosis.",
    };
  }
  if (!hasReport) {
    return {
      label: "Diagnosis Deliverable",
      buttonText: "View Report →",
      href: "/reports",
      description: "Inspect executive diagnosis report and capability deliverable.",
    };
  }
  return {
    label: "Journey Complete",
    buttonText: "View Report & Roadmap →",
    href: "/reports",
    description: "All candidate evaluation stages complete. Review report and development plan.",
  };
}
