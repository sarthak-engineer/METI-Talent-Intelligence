import pytest
from app.agents.quality import is_substantive_response
from app.agents.case_evaluator import CaseEvaluatorAgent
from app.agents.interview_evaluator import evaluate_interview_answer

def test_empty_response():
    assert not is_substantive_response("")
    assert not is_substantive_response("   ")

def test_gibberish_responses():
    assert not is_substantive_response("jytjytjtyj")
    assert not is_substantive_response("ytjytj")
    assert not is_substantive_response("aaaaaaaaaaaaaaaaaaa")
    assert not is_substantive_response("abcabcabcabcabcabc")

def test_copied_prompt():
    prompt = "Please explain how you would design a scalable data architecture for a retail bank."
    assert not is_substantive_response(prompt, prompt)
    assert not is_substantive_response(f"Well, {prompt}", prompt)

def test_short_meaningful_response():
    # Should be valid if it has enough words and unique characters
    assert is_substantive_response("I would use a microservices architecture with Kafka for event streaming.")

def test_normal_substantive_response():
    response = (
        "To design a scalable data architecture for a retail bank, I would implement an event-driven "
        "microservices pattern. Core banking transactions would be processed via a high-throughput event "
        "streaming platform like Apache Kafka. Data would then be sunk into a scalable data lakehouse "
        "such as Databricks or Snowflake for analytics, ensuring a decoupling between operational and "
        "analytical workloads while maintaining strict compliance and auditability."
    )
    assert is_substantive_response(response, "Please explain how you would design a scalable data architecture for a retail bank.")

def test_case_evaluator_quality_check():
    agent = CaseEvaluatorAgent()
    # Gibberish response
    result = agent.evaluate(
        case_title="Test Case",
        case_prompt="Prompt",
        candidate_response="jytjytjtyj",
        expected_competency_ids=["C01"],
        evaluation_rubric=[]
    )
    assert len(result["evaluations"]) == 1
    eval_res = result["evaluations"][0]
    assert eval_res["score"] == 0.0
    assert eval_res["confidence"] == 0.0
    assert "INSUFFICIENT_SUBSTANTIVE_RESPONSE" in eval_res["flags"]

def test_interview_evaluator_quality_check():
    question = {"competency_ids": ["C01"], "question": "Test question"}
    result = evaluate_interview_answer(question, "ytjytj")
    assert result["score"] == 0.0
    assert result["confidence"] == 0.0
    assert "INSUFFICIENT_SUBSTANTIVE_RESPONSE" in result["flags"]

def test_case_evaluator_fallback(monkeypatch):
    agent = CaseEvaluatorAgent()
    # Mock LLM to fail
    def mock_create(*args, **kwargs):
        raise Exception("Timeout")
    
    # Mock groq client chat completions
    monkeypatch.setattr(agent.client.chat.completions, "create", mock_create)
    
    result = agent.evaluate(
        case_title="Test Case",
        case_prompt="Prompt",
        candidate_response="This is a substantive response that has enough words and characters to pass the quality check but the LLM will fail.",
        expected_competency_ids=["C01"],
        evaluation_rubric=[]
    )
    
    assert len(result["evaluations"]) == 1
    eval_res = result["evaluations"][0]
    assert eval_res["score"] == 0.0
    assert eval_res["confidence"] == 0.0
    assert "EVALUATION_FAILED_FALLBACK" in eval_res["flags"]
