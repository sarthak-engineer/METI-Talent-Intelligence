# METI — Modus Enterprise Talent Intelligence

**An evidence-first talent intelligence platform that verifies candidate claims through resume, portfolio, assessment, consulting work samples and structured interview evidence, then converts that evidence into explainable, confidence-aware capability and role-readiness recommendations.**

## Problem

Traditional candidate and profile assessment often relies heavily on self-reported claims and fragmented evidence. It is difficult to distinguish true, demonstrated capability from inflated statements, leading to inaccurate role alignment and poor hiring or staffing outcomes. 

METI addresses this by triangulating evidence across multiple sources, ensuring that capability intelligence is backed by verifiable artifacts and demonstrated behaviors.

## Solution

METI orchestrates a continuous, triangulated evidence lifecycle:

**Profile/Resume** → **Portfolio/GitHub** → **Assessment** → **Case/Work Sample** → **Structured Interview** → **Evidence Synthesis** → **Capability Diagnosis** → **Role Alignment & Readiness** → **Development Plan** → **Human Review** → **Reassessment/Evolution**

## Key Differentiators

- **Evidence before assertion:** Scores are strictly derived from gathered evidence, never fabricated.
- **Evidence triangulation:** Combining self-reported claims with assessment, portfolio, and interview data.
- **Confidence-aware scoring:** Evidence weight is scaled by source reliability.
- **Explainable "Why this score":** Every capability finding traces back to a specific evidence artifact.
- **Evidence Explorer:** A transparent view of all candidate evidence and its provenance.
- **Role alignment vs readiness distinction:** Alignment to a role's shape does not equal absolute readiness.
- **Capability Gap vs Evidence Gap:** Distinguishes between demonstrated lack of ability (capability gap) and a lack of data (evidence gap).
- **Human-in-the-loop review:** Client-facing roles always require human oversight before approval.
- **Immutable analysis snapshots:** Preserves the exact state of evidence and scoring at the time of diagnosis.
- **Development → evidence → reassessment loop:** A continuous cycle of capability growth.

## Architecture

The METI prototype implements a robust client-server architecture:

- **Frontend:** Next.js (React) providing the candidate interface, evidence explorer, and reporting views.
- **FastAPI backend:** A high-performance Python backend coordinating state, evidence storage, and agent execution.
- **Evidence pipeline:** Parsers and ingestors for resumes, GitHub portfolios, and manual inputs.
- **LLM agents:** Specialized agents (Portfolio Intelligence, Evidence Mapper, Evaluators) that interpret qualitative evidence.
- **Deterministic scoring:** Python logic that aggregates scores, applies confidence weights, and determines role matching.
- **Role intelligence & Development:** Rules engines calculating gaps, readiness, and actionable priorities.
- **Review & Reporting:** Generation of immutable snapshots, PDF exports, and review queues.

*LLMs interpret qualitative evidence; deterministic Python owns numerical scoring, weighting, thresholds, confidence aggregation and role matching.*

## Evidence Model

METI weights evidence based on source reliability (not candidate ability). The exact deterministic source-confidence values used in the MVP are:

- **Self Report** — 0.25
- **Structured Scenario** — 0.55
- **Written Response** — 0.65
- **Verified Portfolio** — 0.75
- **Consulting Response** — 0.80
- **Case Work Sample** — 0.85
- **Human Review** — 0.95

*These are evidence-source confidence values, NOT candidate ability scores.*

## Core Metrics

METI surfaces three distinct, highly explainable metrics:

- **CCI (Composite Capability Index):** The deterministic estimate of the candidate's demonstrated capability, weighted by evidence confidence.
- **Evidence Coverage:** The percentage of the target role's competency framework for which substantive evidence has been collected.
- **Evidence Confidence:** The overall reliability of the evidence pool (aggregated source confidences). This represents trust in the data, not candidate ability.

## Role Intelligence

METI separates the concepts of alignment and readiness:

- **Role Alignment / Match:** How well the candidate's shape of capability matches the target role profile.
- **Current Readiness:** An absolute measure combining CCI, threshold requirements, and critical flags.
- **Human Review:** Client-facing readiness recommendations require human intervention; METI acts as an assistant, not an autonomous decider. (Role alignment is not an employment decision).

## Development

The Development Plan targets specific growth areas based on two types of gaps:

- **CAPABILITY_GAP:** The candidate was evaluated on a competency, but their score fell below the target requirement.
- **EVIDENCE_GAP:** The system lacks sufficient evidence to evaluate a required competency. *An evidence gap ≠ lack of ability.*

## Human Review

Because METI's defined roles (e.g., AI Transformation Consultant) are highly critical, client-facing positions, readiness cannot be fully approved by AI alone. Client-facing readiness always triggers a mandatory human review gate to ensure quality, safety, and nuanced judgment.

## Tech Stack

- **Backend:** Python 3.12, FastAPI, Uvicorn, Pytest, Groq Python SDK
- **Frontend:** TypeScript, Next.js, React
- **Data:** Local filesystem JSON stores (MVP/Hackathon state persistence)
- **Document Processing:** PyMuPDF (fitz) for PDF extraction

## Project Structure

```
METI/
├── backend/
│   ├── app/
│   │   ├── agents/         # LLM interpretation agents
│   │   ├── api/            # FastAPI routes
│   │   ├── assessment/     # Diagnostic test engine
│   │   ├── case/           # Case study workflows
│   │   ├── evidence/       # Evidence extraction, ingestion, and stores
│   │   ├── interview/      # Structured interview logic
│   │   ├── models/         # Pydantic schemas
│   │   ├── reports/        # PDF and summary generation
│   │   └── scoring/        # Deterministic math, CCI, role matching
│   └── tests/              # Pytest suite
├── frontend/
│   └── src/
│       └── app/            # Next.js App Router pages and components
└── docs/                   # Architecture diagrams and documentation
```

## Running Locally

**Backend:**
```powershell
cd C:\Users\sarth\Desktop\METI\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --port 8000
```

**Frontend:**
```powershell
cd C:\Users\sarth\Desktop\METI
npm --prefix frontend run dev
```

## Validation

The following commands verify the integrity of the METI pipeline:

```powershell
# Run the backend test suite
cd C:\Users\sarth\Desktop\METI\backend
.\venv\Scripts\Activate.ps1
python -m pytest

# Verify python compilation
python -m compileall app

# Verify frontend build
cd C:\Users\sarth\Desktop\METI
npm --prefix frontend run build
```

## Demo Journey

The canonical end-to-end METI journey:

**Onboarding** → **Resume** → **Assessment** → **Case** → **Interview** → **Evidence** → **Diagnosis** → **Development** → **Report** → **Review** → **Reassessment** → **Evolution**

## Limitations / Hackathon Scope

This repository represents a hackathon MVP implementation of the TDD core diagnosis loop, designed to prove the concept of evidence triangulation and deterministic capability scoring. It is not the complete production-scale METI platform.

Features like psychometric validity guarantees, full production authentication, and hiring-decision automation are expressly out of scope for this prototype.

## Future Production Work

Reasonable extensions supported by the METI TDD for future production phases include:
- Richer assessment coverage across diverse technical domains
- Expanded competency ontology usage
- Deeper enterprise system integrations (ATS, HRIS)
- Fuller assessor/mentor review workflows
- Production authentication and RBAC authorization
- Calibration and bias-monitoring at scale
