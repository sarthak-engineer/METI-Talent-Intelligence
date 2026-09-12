from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.resume import router as resume_router
from app.api.analysis import router as analysis_router
from app.api.evidence import router as evidence_router
from app.api.case import router as case_router
from app.api.entitlements import router as entitlements_router
from app.api.reports import router as reports_router
from app.api.portfolio import router as portfolio_router
from app.api.portfolio_intelligence import router as portfolio_intelligence_router
from app.api.interview import router as interview_router
from app.api.assessment import router as assessment_router
from app.api.review import router as review_router
from app.api.candidates import router as candidates_router


app = FastAPI(
    title="METI - Management Consulting Talent Intelligence",
    version="0.1.0",
    description="Evidence-first consulting capability and development platform.",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health_router, prefix="/api")
app.include_router(resume_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(evidence_router, prefix="/api")
app.include_router(case_router, prefix="/api")
app.include_router(entitlements_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(portfolio_router, prefix="/api")
app.include_router(portfolio_intelligence_router, prefix="/api")
app.include_router(interview_router, prefix="/api")
app.include_router(assessment_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(candidates_router, prefix="/api")


@app.get("/")
def root():
    return {
        "name": "METI",
        "version": "0.1.0",
        "status": "running",
    }
