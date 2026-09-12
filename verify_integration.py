import httpx
import json
import time

def verify_integration():
    candidate_id = "candidate-demo-001"
    pathway = "role-ai-transformation-consultant"

    # 1. Fetch case
    print("1. Fetching case...")
    resp = httpx.get(f"http://127.0.0.1:8000/api/case/?pathway={pathway}")
    case = resp.json()
    print(f"Case ID: {case['case_id']}")
    
    # 2. Start attempt
    print("2. Starting attempt...")
    resp = httpx.post(f"http://127.0.0.1:8000/api/case/attempts?candidate_id={candidate_id}&case_id={case['case_id']}")
    attempt = resp.json()
    attempt_id = attempt["attempt_id"]
    print(f"Attempt ID: {attempt_id}")
    
    # 3. Submit attempt
    print("3. Submitting case...")
    response_text = """
    Business Value: The potential value of Generative AI for this telecom is significant. It can reduce call handling time, improve first-call resolution, and increase customer satisfaction by providing agents with instant, accurate answers from knowledge bases.
    Risks: The primary risks include hallucination (providing incorrect information to customers), data privacy (exposing sensitive PII), and job displacement concerns leading to low agent adoption.
    Transformation Implications: This requires a shift from a purely transactional operating model to an AI-augmented model. 
    Operating Considerations: The legacy CRM systems will need an integration layer or API wrapper to interact with modern AI services safely.
    Implementation Approach: I recommend a phased rollout. Phase 1: Agent-assist pilot for a specific high-volume call type. Phase 2: Refine prompt engineering and RAG based on feedback. Phase 3: Gradual rollout to all agents, coupled with change management and upskilling programs to address job displacement fears.
    """
    resp = httpx.post(f"http://127.0.0.1:8000/api/case/attempts/{attempt_id}/submit", json={"candidate_response": response_text}, timeout=60.0)
    if resp.status_code != 200:
        print("Submission failed:", resp.text)
        return
    submit_result = resp.json()
    evidence = submit_result["evidence"]
    evaluation = submit_result["evaluation"]
    
    print("\nEvidence ID:", evidence["id"])
    print("Evidence Type:", evidence["evidence_type"])
    print("Competency IDs:", evidence["competency_ids"])
    print("Confidence:", evidence["confidence"])
    
    print("\nEvaluations:", json.dumps(evaluation, indent=2))
    
    # 4. Run Analysis
    print("\n4. Running analysis...")
    resp = httpx.post(f"http://127.0.0.1:8000/api/analysis/{candidate_id}", timeout=60.0)
    if resp.status_code != 200:
        print("Analysis failed:", resp.text)
        return
        
    analysis = resp.json()
    print("\nAnalysis Snapshot:", analysis["snapshot_id"])
    
    # Check if evidence is in the details
    found_case = False
    for eval in analysis["evaluations"]:
        for ev in eval["evidence_details"]:
            if ev["id"] == evidence["id"]:
                found_case = True
                print(f"-> Case evidence found under competency {eval['competency_id']}!")
    if not found_case:
        print("-> ERROR: Case evidence NOT found in analysis evaluations.")
        print("Analysis Evaluations:", json.dumps(analysis["evaluations"], indent=2))
        
        # Let's also print the evidence items the candidate has
        resp = httpx.get(f"http://127.0.0.1:8000/api/portfolio_intelligence/{candidate_id}")
        # Actually there is no get evidence endpoint. Let's just print.

if __name__ == "__main__":
    verify_integration()
