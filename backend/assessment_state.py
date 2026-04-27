# backend/assessment_state.py
from dataclasses import dataclass, field


@dataclass
class AssessmentState:
    skills_to_assess: list = field(default_factory=list)
    current_skill_index: int = 0
    current_skill: str = ""
    messages: list = field(default_factory=list)
    question_asked_for_skills: int = 0
    scores: dict = field(default_factory=dict)
    assessment_complete: bool = False
    latest_answer: str = ""