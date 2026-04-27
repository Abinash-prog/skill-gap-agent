# backend/assessment_agent.py
import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from assessment_state import AssessmentState

load_dotenv()

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="meta-llama/llama-4-scout-17b-16e-instruct",
    temperature=0.3
)


def get_history(messages: list, count: int) -> str:
    """Safely extract history from messages list."""
    recent = messages[-count:]
    lines = []
    for m in recent:
        # handle both dict and object safely
        if isinstance(m, dict):
            role = m.get("role", "unknown").upper()
            content = m.get("content", "")
        else:
            role = str(m.role).upper()
            content = str(m.content)
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


# ─────────────────────────────────────────
# NODE 1 — Ask
# ─────────────────────────────────────────
def ask_node(state: AssessmentState) -> AssessmentState:
    skill = state.current_skill
    q_count = state.question_asked_for_skills
    history = get_history(state.messages, 6)

    if q_count == 0:
        instruction = f"""
You are a technical interviewer assessing a candidate's knowledge of: {skill}

Ask your FIRST question about {skill}.
- Start simple but specific
- Ask only ONE question
- Do not explain why you are asking
- Do not say 'Great' or give feedback yet
- Be conversational, not robotic

Recent conversation:
{history}
"""
    else:
        instruction = f"""
You are a technical interviewer assessing: {skill}
You have asked {q_count} question(s) so far.

Based on the conversation so far, ask a FOLLOW-UP question to go deeper.
- If previous answer was weak, ask something more basic to confirm level
- If previous answer was strong, ask something harder
- Ask only ONE question
- No feedback or evaluation yet

Recent conversation:
{history}
"""

    response = llm.invoke([SystemMessage(content=instruction)])
    question = response.content.strip()

    state.messages.append({"role": "assistant", "content": question})
    state.question_asked_for_skills += 1

    return state


# ─────────────────────────────────────────
# NODE 2 — Evaluate
# ─────────────────────────────────────────
def evaluate_node(state: AssessmentState) -> AssessmentState:
    skill = state.current_skill
    history = get_history(state.messages, 8)

    prompt = f"""
You are evaluating a candidate's proficiency in: {skill}

Based on the full conversation below, score the candidate's current demonstrated
knowledge of {skill} on a scale of 0 to 10.

Scoring guide:
0-2  = No real knowledge, just buzzwords
3-4  = Basic awareness, cannot apply it
5-6  = Can use it with guidance, understands core concepts
7-8  = Solid working knowledge, can work independently
9-10 = Expert level, deep understanding

Conversation:
{history}

Return ONLY valid JSON. No explanation. No markdown. No code blocks.
{{
  "score": <number 0-10>,
  "confidence": "low",
  "reasoning": "one sentence why"
}}
"""

    response = llm.invoke([HumanMessage(content=prompt)])
    raw = response.content.strip()

    # strip markdown if model wraps it
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        result = json.loads(raw)
        state.scores[skill] = int(result["score"])
    except Exception:
        # if JSON parse fails, assign a default mid score
        state.scores[skill] = 5

    return state


# ─────────────────────────────────────────
# NODE 3 — Decide
# ─────────────────────────────────────────
def decide_node(state: AssessmentState) -> AssessmentState:
    skill = state.current_skill
    score = state.scores.get(skill, 0)
    q_count = state.question_asked_for_skills
    max_questions = 3

    should_move = (
        q_count >= max_questions or
        (q_count >= 2 and score >= 8) or
        (q_count >= 2 and score <= 3)
    )

    if should_move:
        next_index = state.current_skill_index + 1

        if next_index >= len(state.skills_to_assess):
            # All skills done
            state.assessment_complete = True
            closing = (
                "Thank you! I've completed the assessment for all skills.\n"
                "Here's a quick summary of your scores:\n\n"
            )
            for s, sc in state.scores.items():
                label = (
                    "Strong" if sc >= 7 else
                    "Moderate" if sc >= 4 else
                    "Needs Work"
                )
                closing += f"• {s}: {sc}/10 ({label})\n"

            closing += "\nI'll now generate your personalized learning plan."
            state.messages.append({"role": "assistant", "content": closing})

        else:
            # Move to next skill
            state.current_skill_index = next_index
            state.current_skill = state.skills_to_assess[next_index]
            state.question_asked_for_skills = 0

            transition = (
                f"Got it. Let's move on to the next skill: "
                f"**{state.current_skill}**."
            )
            state.messages.append({"role": "assistant", "content": transition})

    return state


# ─────────────────────────────────────────
# Public functions — NO LangGraph graph
# ─────────────────────────────────────────
def start_assessment(missing_skills: list[str]) -> AssessmentState:
    """Start a brand new assessment session."""
    state = AssessmentState(
        skills_to_assess=missing_skills,
        current_skill_index=0,
        current_skill=missing_skills[0],
        question_asked_for_skills=0
    )
    # call ask_node directly — no graph invoke
    state = ask_node(state)
    return state


def continue_assessment(state: AssessmentState, user_answer: str) -> AssessmentState:
    """Continue assessment with candidate's answer."""
    state.messages.append({"role": "user", "content": user_answer})
    state.latest_answer = user_answer

    state = evaluate_node(state)
    state = decide_node(state)

    if not state.assessment_complete:
        state.latest_answer = ""
        state = ask_node(state)

    return state