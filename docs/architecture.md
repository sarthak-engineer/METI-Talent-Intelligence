# METI Architecture

The following diagram illustrates the core data flow, evidence triangulation, and deterministic scoring pipeline within the METI platform. 

It highlights the boundary between qualitative LLM interpretation and the strict, immutable deterministic Python engine.

```mermaid
graph TD
    %% Candidate Entry
    Candidate([Candidate]) --> Profile[Profile / Resume]
    Profile --> EvidenceSources
    
    %% Evidence Sources
    subgraph EvidenceSources [Triangulated Evidence Sources]
        Assessment[Assessment]
        Case[Case Work Sample]
        Interview[Structured Interview]
        Portfolio[Portfolio / GitHub]
    end
    
    %% Processing Pipeline
    EvidenceSources --> Pipeline[Evidence Pipeline]
    Pipeline --> Mapping[Evidence Mapping]
    
    %% LLM Boundary
    subgraph LLMBoundary [Qualitative Interpretation]
        Mapping --> LLMEval[LLM Qualitative Evaluation]
    end
    
    %% Deterministic Engine
    LLMEval --> Engine[Deterministic Scoring Engine]
    
    subgraph Engine [Deterministic Scoring Engine]
        CCI[CCI - Composite Capability Index]
        Coverage[Evidence Coverage]
        Confidence[Evidence Confidence]
    end
    
    %% Output and Roles
    Engine --> Snapshot{Immutable AnalysisSnapshot}
    
    Snapshot --> RoleIntel[Role Intelligence]
    
    subgraph RoleIntel [Role Intelligence]
        Alignment[Role Alignment]
        Readiness[Current Readiness]
    end
    
    %% Post-Diagnosis Actions
    RoleIntel --> Review[Human Review]
    Snapshot --> DevPlan[Development Plan]
    
    %% Feedback Loop
    DevPlan --> Reassessment[Reassessment]
    Reassessment -.-> EvidenceSources
    Snapshot --> Evolution[Evolution Tracking]
    
    %% Styling
    classDef llm fill:#f3e8ff,stroke:#9333ea,stroke-width:2px;
    classDef engine fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef snapshot fill:#fef08a,stroke:#ca8a04,stroke-width:2px;
    classDef source fill:#dcfce7,stroke:#16a34a,stroke-width:1px;
    
    class LLMBoundary llm;
    class Engine engine;
    class Snapshot snapshot;
    class Assessment,Case,Interview,Portfolio source;
```

## Immutable Audit Boundary

The `AnalysisSnapshot` represents the core audit boundary in the system. 
- **Before the snapshot:** Evidence is gathered, synthesized, and interpreted.
- **After the snapshot:** The state of the candidate's capability at that exact moment is frozen. Any future human reviews, development plans, or role alignments strictly reference this immutable ID. New evidence triggers a completely new snapshot, allowing accurate evolution tracking over time.
