import os
import json
from typing import TypedDict, Any

from dotenv import load_dotenv
from groq import Groq
from langgraph.graph import StateGraph, START, END

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY is missing from the backend .env file.")

client = Groq(api_key=api_key)

MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


class RCAState(TypedDict):
    incident_text: str
    extracted_data: dict[str, Any]
    rca_result: dict[str, Any]


def call_ai(prompt: str) -> dict:
    """Call Groq and safely parse its JSON response."""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        response_format={"type": "json_object"}
    )

    content = response.choices[0].message.content
    return json.loads(content)


def extract_incident(state: RCAState):
    prompt = f"""
You are assisting pharmaceutical API manufacturing quality professionals.

Extract facts from this incident report. Do not invent information.

Return JSON with exactly these fields:
{{
  "product_name": null,
  "batch_number": null,
  "equipment": null,
  "incident_type": null,
  "incident_date": null,
  "description": null,
  "expected_value": null,
  "actual_value": null,
  "possible_causes": [],
  "missing_evidence": []
}}

Rules:
- Use null when a field is not stated.
- Possible causes are hypotheses, not confirmed facts.
- List evidence that should be collected.
- Return JSON only.

INCIDENT REPORT:
{state["incident_text"]}
"""

    extracted = call_ai(prompt)
    return {"extracted_data": extracted}


def generate_rca(state: RCAState):
    extracted = state["extracted_data"]

    prompt = f"""
You are an experienced pharmaceutical API manufacturing
Root Cause Analysis (RCA) assistant.

Use the incident report and extracted facts below to prepare
a structured investigation.

FIVE WHYS RULES:
1. Generate exactly five different questions.
2. Never repeat "Why did that happen?".
3. Each question must logically follow the previous answer.
4. Move from the immediate incident to deeper process,
   equipment, human or management-system causes.
5. Answers must be based on available evidence.
6. If evidence is insufficient, clearly state
   "Further investigation required".
7. Do not invent a confirmed root cause.

INCIDENT REPORT:
{state["incident_text"]}

EXTRACTED FACTS:
{json.dumps(extracted, ensure_ascii=False)}

Return valid JSON with exactly this structure:

{{
  "five_whys": [
    {{
      "why": 1,
      "question": "Why did the incident occur?",
      "answer": "..."
    }},
    {{
      "why": 2,
      "question": "Why did the immediate cause occur?",
      "answer": "..."
    }},
    {{
      "why": 3,
      "question": "Why did the underlying condition occur?",
      "answer": "..."
    }},
    {{
      "why": 4,
      "question": "Why was the condition not detected or prevented?",
      "answer": "..."
    }},
    {{
      "why": 5,
      "question": "What system-level weakness allowed the incident?",
      "answer": "..."
    }}
]
  ],
  "fishbone": {{
    "Man": [],
    "Machine": [],
    "Method": [],
    "Material": [],
    "Measurement": [],
    "Environment": []
  }},
  "potential_causes": [
    {{
      "cause": "Possible cause",
      "reason": "Why it may have contributed",
      "status": "Hypothesis"
    }}
  ],
  "missing_evidence": [
    "Evidence or record that should be checked"
  ],
  "capa": {{
    "corrective_actions": [
      {{
        "action": "Immediate action to address the incident",
        "priority": "High",
        "responsible_role": "Suggested responsible role"
      }}
    ],
    "preventive_actions": [
      {{
        "action": "Action to reduce recurrence",
        "priority": "Medium",
        "responsible_role": "Suggested responsible role"
      }}
    ]
  }},
  "human_review_note": "The investigation team must verify all hypotheses and approve actions before implementation."
}}

Important:
- Do not claim a root cause is confirmed unless the report provides evidence.
- If the five whys cannot be answered from the report, explicitly say
  that further investigation or evidence is required.
- Fishbone entries must be relevant; use empty arrays when unsupported.
- CAPA recommendations must be practical and relevant to the incident.
- Return JSON only.
"""

    result = call_ai(prompt)
    return {"rca_result": result}


builder = StateGraph(RCAState)

builder.add_node("extract_incident", extract_incident)
builder.add_node("generate_rca", generate_rca)

builder.add_edge(START, "extract_incident")
builder.add_edge("extract_incident", "generate_rca")
builder.add_edge("generate_rca", END)

rca_graph = builder.compile()


def analyze_incident(text: str):
    """Extract incident details only."""
    result = extract_incident({
        "incident_text": text,
        "extracted_data": {},
        "rca_result": {}
    })
    return result["extracted_data"]


def perform_rca(text: str):
    """Generate extracted facts and the complete RCA report."""
    result = rca_graph.invoke({
        "incident_text": text,
        "extracted_data": {},
        "rca_result": {}
    })

    return {
        "extracted_data": result["extracted_data"],
        "rca": result["rca_result"]
    }