# METI — Talent Intelligence Platform

> **Evidence-first talent intelligence for capability diagnosis, role readiness, development, and reassessment.**

METI (Modus Enterprise Talent Intelligence) is an AI-powered, evidence-first talent intelligence platform designed to assess consulting capabilities, understand role readiness, and turn assessment insights into actionable development pathways.

Rather than relying solely on self-reported profiles or isolated assessment scores, METI brings together evidence from multiple sources — including resumes, structured assessments, consulting work samples, interviews, and portfolio/GitHub signals — to build a more holistic, explainable, and confidence-aware view of a candidate's capabilities.

This evidence is then translated into capability diagnosis, evidence confidence, role alignment, development priorities, human review, and measurable reassessment over time.

**Evidence → Capability → Confidence → Role Readiness → Development → Human Review → Reassessment**

The platform is designed around a simple principle:

> **A claim is not the same as evidence, and a score is not the same as confidence.**

---

# Live Demo
https://meti-talent-intelligence-frontend.onrender.com


## Why METI?

Traditional talent assessment often separates information across resumes, interviews, assessments, portfolios, and recruiter judgement.

This creates several problems:

- Self-reported capability can be difficult to verify.
- Different evidence sources may tell different stories.
- A high score from weak evidence can create false confidence.
- Missing evidence can be incorrectly interpreted as lack of capability.
- Candidates are often given scores without understanding **why** they received them.
- Development recommendations are frequently disconnected from the actual role requirements.

METI addresses these problems with an evidence-first approach.

### Instead of

```text
Resume
   ↓
Assessment
   ↓
Score
   ↓
Role
```

### METI uses

```text
Candidate Claims
      +
Resume / Profile
      +
Assessment
      +
Case / Work Sample
      +
Structured Interview
      +
Portfolio Signals
          │
          ▼
   Evidence Layer
          │
          ▼
Evidence Mapping
          │
          ▼
Qualitative AI Evaluation
          │
          ▼
Deterministic Scoring
          │
          ├── Capability
          ├── Evidence Coverage
          ├── Evidence Confidence
          └── Role Readiness
          │
          ▼
 Development Priorities
          │
          ▼
 Human Review
          │
          ▼
 Reassessment & Evolution
```

---

# Core Product Journey

METI follows a complete assessment-to-development lifecycle:

```text
┌──────────────┐
│   Profile    │
└──────┬───────┘
       ↓
┌──────────────┐
│ Resume / CV  │
└──────┬───────┘
       ↓
┌──────────────┐
│  Assessment  │
└──────┬───────┘
       ↓
┌──────────────┐
│ Case / Work  │
│    Sample    │
└──────┬───────┘
       ↓
┌──────────────┐
│  Structured  │
│  Interview   │
└──────┬───────┘
       ↓
┌──────────────┐
│    Evidence  │
│   Synthesis  │
└──────┬───────┘
       ↓
┌──────────────┐
│   Diagnosis  │
└──────┬───────┘
       ↓
┌──────────────┐
│ Role Readiness│
└──────┬────────┘
       ↓
┌──────────────┐
│ Development  │
└──────┬───────┘
       ↓
┌──────────────┐
│ Human Review │
└──────┬───────┘
       ↓
┌──────────────┐
│ Reassessment │
└──────┬───────┘
       ↓
┌──────────────┐
│  Evolution   │
└──────────────┘
```

---

# Key Capabilities

## 1. Evidence-First Assessment

METI does not treat every input equally.

Different evidence sources have different levels of evidentiary strength:

| Evidence Type | Confidence Weight |
|---|---:|
| Self-report | 0.25 |
| Structured scenario | 0.55 |
| Written response | 0.65 |
| Verified portfolio | 0.75 |
| Consulting response | 0.80 |
| Case / work sample | 0.85 |
| Human review | 0.95 |

These weights are used as part of the evidence-confidence model rather than allowing a weak self-report to carry the same evidentiary strength as a reviewed work sample.

---

## 2. Explainable Capability Diagnosis

Every evaluated capability can be traced back to supporting evidence.

METI provides an evidence-oriented explanation containing concepts such as:

```text
Capability
   ↓
Score
   ↓
Evaluation Confidence
   ↓
Supporting Evidence
   ↓
Evidence Source
   ↓
Evidence Type
   ↓
Strengths / Gaps / Flags
```

This enables a user to answer:

> **"Why did I receive this score?"**

rather than simply seeing a number.

---

# 3. Confidence-Aware Scoring

METI separates three important concepts:

### Capability Score

How strong the evaluated capability appears to be based on available evidence.

### Evidence Coverage

How much of the relevant competency space is actually supported by evidence.

### Evidence Confidence

How confident METI is in the evidence supporting the diagnosis.

This distinction is important because:

```text
High score + weak evidence
       ≠
High-confidence capability finding
```

A candidate can therefore have promising capability signals while still requiring additional evidence.

---

# 4. Role Intelligence

METI evaluates role alignment using explicit role requirements rather than treating role fit as a generic AI opinion.

Current consulting-oriented pathways include:

- **AI Transformation Consultant**
- **Business / Technology Consultant**
- **AI / ML Consultant**

Role requirements are evaluated against the candidate's current evidence.

METI also distinguishes role readiness states such as:

```text
READY
READY_WITH_LOW_EVIDENCE_CONFIDENCE
READY_WITH_DEVELOPMENT
DEVELOPING
HUMAN_REVIEW_REQUIRED
```

The platform can also classify pathways as:

```text
PRIMARY
STRETCH
DEVELOPING
```

This allows a candidate to see not only the strongest current pathway, but also realistic development directions.

> Role match is an evidence-based alignment indicator, not a guarantee of employment or suitability.

---

# 5. Evidence Gaps vs Capability Gaps

One of METI's important design decisions is to distinguish:

### Capability Gap

There is enough evidence to evaluate the capability, and the observed score is below the role requirement.

### Evidence Gap

There is not enough relevant evidence to make a strong capability finding.

This prevents the system from making the incorrect assumption:

```text
No evidence
   ↓
No capability
```

Instead:

```text
No evidence
   ↓
Evidence gap
   ↓
Collect stronger evidence
   ↓
Reassess
```

This supports a development-oriented assessment model rather than a rejection-oriented model.

---

# 6. Evidence Triangulation

METI can compare evidence across multiple sources.

For example:

```text
Resume claim
      +
Assessment response
      +
Case response
      +
Interview response
      ↓
Triangulation
      ↓
Stronger / weaker / conflicting evidence signal
```

Structured interview questions can be grounded in candidate evidence, allowing the interview process to verify claims or probe areas where evidence is weak.

---

# 7. Structured Interview Grounding

Interview questions are generated from candidate-specific evidence rather than generic questions alone.

Question categories include:

- **Claim Verification**
- **Evidence Triangulation**
- **Competency Probe**

The system can use source evidence identifiers to show what a question is intended to verify.

This creates a more meaningful interview loop:

```text
Candidate claim
      ↓
Interview question
      ↓
Candidate response
      ↓
Consulting-response evidence
      ↓
Updated diagnosis
```

---

# 8. Portfolio / GitHub Evidence

METI can incorporate public portfolio/GitHub signals as supporting evidence.

Portfolio evidence is treated as:

> **supporting evidence, not proof of authorship, proficiency, or employment capability.**

Repository metadata can contribute provenance and context while avoiding unsupported claims about what a candidate personally implemented.

---

# 9. Evidence Evolution

METI is designed around reassessment rather than one-time scoring.

After a new assessment, case, interview, or other evidence source is added, the system can compare analysis snapshots:

```text
Previous Snapshot
       ↓
Additional Evidence
       ↓
New Analysis Snapshot
       ↓
Comparison
       ↓
What changed?
```

Evolution can surface changes in:

- CCI
- Evidence Confidence
- Evidence Coverage
- Competency scores
- Newly mapped evidence
- Role readiness
- Requirements gained/lost
- Resolved/new gaps

This creates a progression model rather than a static scorecard.

---

# 10. Human Review

METI intentionally keeps human oversight in the workflow.

Certain conditions can create a review requirement, including:

- Client-facing pathways
- Low evidence confidence
- Integrity/consistency concerns
- Critical evaluation flags

The AI does not independently make adverse employment decisions.

Instead:

```text
AI Evidence Evaluation
        ↓
Deterministic Analysis
        ↓
Review Gate
        ↓
Human Review
        ↓
Final Decision / Development Action
```

This reflects METI's principle:

> **AI assists assessment; human judgement remains part of consequential decisions.**

---

# Architecture

METI uses a hybrid architecture in which LLMs handle qualitative interpretation while deterministic application code handles numerical business rules.

```text
                           ┌───────────────────────┐
                           │      Next.js UI        │
                           │  Candidate Experience  │
                           └───────────┬───────────┘
                                       │
                                  REST API
                                       │
                                       ▼
                           ┌───────────────────────┐
                           │      FastAPI API       │
                           │       Layer            │
                           └───────────┬───────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
             ┌────────────┐    ┌─────────────┐    ┌──────────────┐
             │ Assessment │    │   Evidence  │    │   Interview  │
             │   Engine   │    │   Pipeline  │    │    Engine    │
             └─────┬──────┘    └──────┬──────┘    └──────┬───────┘
                   │                  │                  │
                   └──────────────────┼──────────────────┘
                                      ▼
                           ┌──────────────────────┐
                           │   AI Evaluation      │
                           │       Layer          │
                           │                      │
                           │ Evidence Mapping     │
                           │ Qualitative Eval     │
                           │ Interview Eval       │
                           │ Case Evaluation      │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │ Deterministic        │
                           │ Scoring Engine       │
                           │                      │
                           │ CCI                  │
                           │ Coverage             │
                           │ Evidence Confidence  │
                           │ Role Matching        │
                           │ Readiness            │
                           │ Development Gaps     │
                           └──────────┬───────────┘
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                   ┌──────────┐ ┌──────────┐ ┌───────────┐
                   │ Reports  │ │ Review   │ │ Evolution │
                   └──────────┘ └──────────┘ └───────────┘
```

### Core architectural principle

> **LLMs interpret qualitative evidence; deterministic Python owns numerical scoring, weighting, thresholds, confidence aggregation, and role matching.**

This separation makes the system easier to reason about, test, and audit.

---

# AI Layer

METI uses an LLM for tasks where language understanding is useful, including:

- Evidence extraction and interpretation
- Competency mapping
- Qualitative evaluation
- Case/work-sample evaluation
- Interview evaluation
- Evidence-grounded explanations
- Report-oriented synthesis

The LLM does **not** own the core numerical business rules.

For example:

```text
LLM
 └── "What does this response demonstrate?"

Python
 └── "How should that evidence contribute to the final score?"
```

This is intentional.

---

# Scoring Architecture

The current implementation uses a weighted composite capability layer.

Core outputs include:

```text
CCI
Evidence Coverage
Evidence Confidence
Role Match
Role Readiness
Development Priorities
```

The scoring system combines:

- competency-level evaluation
- evidence confidence
- competency weighting
- evidence coverage
- role requirements
- evaluation confidence
- readiness thresholds

Numerical scoring and business rules are calculated deterministically rather than delegated to the LLM.

---

# Current Capability Model

METI's underlying consulting capability model is organized around consulting-relevant dimensions including areas such as:

- Strategy & enterprise thinking
- Research & insight
- Enterprise analysis
- Process, capability & operating model
- Transformation & change
- Organisation & governance
- Programme / portfolio / benefits
- Enterprise AI transformation
- Problem structuring
- Commercial thinking
- Executive communication
- Stakeholder management
- Professional judgement
- Learning agility

The current scoring implementation uses a **weighted 14-domain composite layer** while supporting the broader consulting capability ontology defined by the product design.

---

# Repository Structure

```text
METI/
│
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   ├── api/
│   │   ├── assessment/
│   │   ├── evidence/
│   │   ├── interview/
│   │   ├── models/
│   │   ├── orchestration/
│   │   ├── reports/
│   │   ├── scoring/
│   │   ├── security/
│   │   └── main.py
│   │
│   ├── data/
│   ├── tests/
│   ├── uploads/
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   └── components/
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── Next.js / PostCSS / ESLint configuration
│
├── docs/
│   └── architecture.md
│
├── .gitignore
└── README.md
```

Generated/local artifacts such as `.venv`, `node_modules`, `.next`, `__pycache__`, and `.env` are excluded from version control.

---

# Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- CSS

## Backend

- Python
- FastAPI
- Pydantic
- Uvicorn

## AI

- Groq API
- Configurable LLM model
- Structured AI evaluation workflows

## Document / Evidence Processing

- PyMuPDF
- Multipart file handling
- JSON-based evidence/runtime persistence

## Quality

- Pytest
- Python compilation checks
- Next.js production builds

## Deployment

- GitHub
- Render
- Separate frontend and backend services

---

# Deployment Architecture

METI is deployed as two services:

```text
                    GitHub
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
       Render Web Service   Render Web Service
          meti-api          meti-frontend
              │                 │
              │                 │
              └───────┬─────────┘
                      │
                      ▼
                   Groq API
```

### Backend

```text
Root Directory:
backend
```

Build:

```bash
pip install -r requirements.txt
```

Start:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Frontend

```text
Root Directory:
frontend
```

Build:

```bash
npm install && npm run build
```

Start:

```bash
npm start
```

The frontend receives the backend URL through:

```text
NEXT_PUBLIC_API_URL
```

---

# Local Development

## 1. Clone

```bash
git clone https://github.com/sarthak-engineer/METI-Talent-Intelligence.git
cd meti-talent-intelligence
```

## 2. Backend

```bash
cd backend
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create environment variables:

```text
GROQ_API_KEY=your_key
GROQ_MODEL=openai/gpt-oss-120b
```

Run:

```bash
uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

## 3. Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create:

```text
.env.local
```

with:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Run:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

# Testing

### Backend compilation

```bash
python -m compileall backend/app
```

### Backend tests

```bash
pytest tests
```

### Frontend production build

```bash
npm --prefix frontend run build
```

The current release has been validated with:

```text
Backend compilation: PASS
Backend tests:       45 passed
Frontend build:      PASS
```

---

# Design Principles

METI is built around several principles.

### Evidence before assertion

Candidate claims should be supported by evidence whenever possible.

### Explainability by design

A score should have an understandable evidence trail.

### Development rather than rejection

Missing evidence should lead to an opportunity to collect stronger evidence rather than automatically becoming a negative capability judgement.

### Confidence matters

A capability score without evidence confidence can be misleading.

### Human-in-the-loop

Consequential decisions should retain human oversight.

### Versioned analysis

Analyses are represented as snapshots so changes can be compared over time.

### Deterministic business rules

Core scoring, weighting, thresholds, role matching, and confidence aggregation remain deterministic.

### Candidate isolation

Evidence, assessments, analysis snapshots, reports, reviews, and development plans are scoped to the current candidate.

---

# Responsible AI & Guardrails

METI is designed as an assessment and development support system, not an autonomous employment decision engine.

The system intentionally avoids using prohibited or inappropriate signals such as:

- Facial attractiveness
- Facial emotion inference
- Race
- Gender
- Age
- Disability
- Accent-based scoring

The platform is not intended to provide:

- Clinical or mental-health diagnoses
- Employment guarantees
- Salary guarantees
- Visa guarantees
- Unreviewed adverse employment decisions
- Official psychometric validity claims without appropriate validation

Portfolio and GitHub signals are treated as supporting evidence rather than definitive proof of authorship or expertise.

---

# Important Limitations

METI is a prototype / assessment platform demonstrating an evidence-first architecture.

It should **not** be interpreted as:

- a legally validated hiring decision system
- an officially validated psychometric assessment
- an autonomous recruiter
- a replacement for experienced human assessors

Real-world enterprise deployment would require additional work around areas such as:

- production-grade authentication and authorization
- tenant isolation
- durable production databases
- privacy and retention controls
- security hardening
- monitoring and observability
- formal model evaluation
- fairness testing
- assessor calibration
- governance and audit procedures
- scalable persistent storage

---

# Product Differentiators

METI focuses on several capabilities that are often missing from simple AI assessment applications:

### 1. Evidence → Capability

Rather than directly asking an LLM to produce a candidate score, METI first builds an evidence layer.

### 2. Confidence-aware diagnosis

Capability and confidence are intentionally separated.

### 3. Evidence Explorer

Users can inspect the evidence behind a competency finding.

### 4. Evidence vs capability gaps

Missing evidence is not automatically treated as low capability.

### 5. Role readiness

Role alignment is evaluated against explicit requirements.

### 6. Development loop

Diagnosis is connected to concrete development priorities.

### 7. Reassessment

New evidence produces a new snapshot rather than overwriting historical analysis.

### 8. Human review

Client-facing and lower-confidence findings can be routed through a review gate.

---

# Example End-to-End Output

A METI diagnosis can conceptually produce:

```text
Candidate
   │
   ├── CCI
   ├── Evidence Coverage
   ├── Evidence Confidence
   │
   ├── Capability Diagnosis
   │     ├── Strengths
   │     ├── Gaps
   │     ├── Supporting Evidence
   │     └── Confidence
   │
   ├── Role Intelligence
   │     ├── Primary
   │     ├── Stretch
   │     └── Developing
   │
   ├── Development Plan
   │     ├── Evidence Gaps
   │     ├── Capability Gaps
   │     ├── Actions
   │     └── Success Measures
   │
   ├── Human Review
   │
   └── Evolution
         └── Previous vs Current Snapshot
```

---

# Project Vision

METI is designed around a broader idea:

> **Talent intelligence should not stop at measuring capability. It should understand the evidence behind capability, communicate uncertainty, identify what needs to be developed, and learn as new evidence arrives.**

The resulting loop is:

```text
        ┌───────────────────────┐
        │        Evidence       │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │       Diagnosis       │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │    Role Readiness     │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │      Development      │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │    New Evidence       │
        └───────────┬───────────┘
                    ↓
              Reassessment
                    │
                    └───────────────↻
```

**METI turns assessment into a continuous evidence-and-development cycle.**

---

# Repository

```text
https://github.com/<your-username>/meti-talent-intelligence
```

---

# Status

**Hackathon Release — Deployed**

The current release includes the core METI assessment and diagnosis loop, evidence-aware scoring, role intelligence, development planning, human review workflow, reporting, and reassessment/evolution capabilities.

---

# Author

**Sarthak B.C.**

Built as an AI/ML engineering project demonstrating practical application of:

- Generative AI
- Evidence-grounded evaluation
- Deterministic scoring systems
- Consulting capability modelling
- Human-in-the-loop AI
- Full-stack application engineering
