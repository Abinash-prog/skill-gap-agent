# backend/learning_plan.py
import os
import json
import traceback
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="meta-llama/llama-4-scout-17b-16e-instruct",
    temperature=0.4
)


def generate_gap_analysis(
    jd_skills: list[str],
    resume_skills: list[str],
    scores: dict[str, int]
) -> dict:
    """
    Classify each missing skill into:
    - critical: must have for the job
    - adjacent: learnable within weeks
    - stretch: long term goal
    """
    prompt = f"""
You are a career advisor doing a skill gap analysis.

Job requires these skills: {jd_skills}
Candidate already has: {resume_skills}
Candidate's assessed proficiency scores (0-10): {json.dumps(scores)}

Classify each skill the candidate is MISSING or scored below 6 into one of:
- "critical": required for the job, no workaround
- "adjacent": not required but learnable quickly (1-4 weeks), builds on what they know
- "stretch": complex skill needing months to acquire

Return ONLY valid JSON. No explanation. No markdown. No code blocks.
{{
  "critical": ["skill1", "skill2"],
  "adjacent": ["skill1", "skill2"],
  "stretch": ["skill1", "skill2"],
  "summary": "2 sentence honest summary of the candidate's readiness"
}}
"""
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        raw = response.content.strip()

        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        return json.loads(raw)

    except json.JSONDecodeError as e:
        traceback.print_exc()
        return {
            "critical": [],
            "adjacent": [],
            "stretch": [],
            "summary": f"Gap analysis parsing failed: {str(e)}",
            "raw": raw
        }
    except Exception as e:
        traceback.print_exc()
        raise RuntimeError(f"[gap_analysis] LLM call failed: {str(e)}")


def generate_learning_plan(
    candidate_name: str,
    scores: dict[str, int],
    gap_analysis: dict,
    resume_skills: list[str]
) -> dict:
    """
    Generate a week-by-week personalized learning plan
    focused on critical and adjacent skills only.
    """
    critical = gap_analysis.get("critical", [])
    adjacent = gap_analysis.get("adjacent", [])
    skills_to_learn = critical + adjacent

    if not skills_to_learn:
        return {
            "candidate": candidate_name,
            "total_weeks": 0,
            "plan": [],
            "note": "No critical or adjacent skill gaps found. Candidate is well-matched."
        }

    prompt = f"""
You are a senior engineering mentor creating a personalized learning plan.

Candidate already knows: {resume_skills}
Skills to learn (prioritized): {skills_to_learn}
Current proficiency scores: {json.dumps(scores)}

Create a realistic week-by-week learning plan. Rules:
- Focus ONLY on critical and adjacent skills: {skills_to_learn}
- Order by dependency (learn basics before advanced)
- Each week should have: 1 primary skill focus, specific resources, daily time commitment
- Be realistic — assume 1-2 hours per day of study time
- Resources must be specific (exact course names, official docs, GitHub repos)
- Do NOT suggest stretch goals — keep it achievable

Return ONLY valid JSON. No explanation. No markdown. No code blocks.
{{
  "total_weeks": <number>,
  "weekly_plan": [
    {{
      "week": 1,
      "skill_focus": "skill name",
      "goal": "what candidate can do by end of week",
      "daily_hours": <number>,
      "resources": [
        {{
          "type": "course|docs|video|project",
          "title": "exact title",
          "url": "url if known or empty string",
          "estimated_hours": <number>
        }}
      ],
      "milestone": "one concrete thing to build or demonstrate"
    }}
  ]
}}
"""
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        raw = response.content.strip()

        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        plan_data = json.loads(raw)
        plan_data["candidate"] = candidate_name
        return plan_data

    except json.JSONDecodeError as e:
        traceback.print_exc()
        return {
            "candidate": candidate_name,
            "total_weeks": 0,
            "weekly_plan": [],
            "error": f"Learning plan parsing failed: {str(e)}",
            "raw": raw
        }
    except Exception as e:
        traceback.print_exc()
        raise RuntimeError(f"[learning_plan] LLM call failed: {str(e)}")