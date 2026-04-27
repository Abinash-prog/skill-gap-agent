# backend/main.py
import traceback
import io
from pdf_parser import extract_text_from_pdf
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from skill_extractor import extract_skills
from assessment_agent import start_assessment, continue_assessment
from assessment_state import AssessmentState
from learning_plan import generate_gap_analysis, generate_learning_plan

load_dotenv()

app = FastAPI()

# ----- CORS ------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # dev
        "http://localhost:4173",      # preview   
        "https://skill-gap-agent.vercel.app",  # replace with your actual vercel URL later
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
sessions: dict[str, AssessmentState] = {}


# ── Request Models ────────────────────────────────────────

class SkillExtractionRequest(BaseModel):
    jd: str
    resume: str

class StartAssessmentRequest(BaseModel):
    session_id: str
    missing_skills: list[str]

class ContinueAssessmentRequest(BaseModel):
    session_id: str
    answer: str

class GapAnalysisRequest(BaseModel):
    jd_skills: list[str]
    resume_skills: list[str]
    scores: dict[str, int]

class LearningPlanRequest(BaseModel):
    candidate_name: str
    jd_skills: list[str]
    resume_skills: list[str]
    scores: dict[str, int]


# ── Helper ────────────────────────────────────────────────

def safe_get_last_message(messages: list) -> str:
    """Safely get last message content regardless of type."""
    if not messages:
        return ""
    last = messages[-1]
    try:
        if isinstance(last, dict):
            return last.get("content", "")
        return str(last.content)
    except Exception:
        return str(last)

def state_to_dict(state: AssessmentState) -> dict:
    """Convert AssessmentState dataclass to dict safely."""
    return {
        "current_skill": state.current_skill,
        "question": safe_get_last_message(state.messages),
        "assessment_complete": state.assessment_complete,
        "scores": state.scores,
        "messages": state.messages,
        "skills_to_assess": state.skills_to_assess,
        "current_skill_index": state.current_skill_index,
    }


# ── Routes ────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "running"}


@app.post("/extract-skills")
def extract_skills_route(request: SkillExtractionRequest):
    if not request.jd.strip() or not request.resume.strip():
        raise HTTPException(status_code=400, detail="JD and Resume cannot be empty")
    try:
        return extract_skills(jd=request.jd, resume=request.resume)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"[extract_skills] {str(e)}")

@app.post("/parse-pdf")
async def parse_pdf_route(file: UploadFile = File(...)):
    """
    Accept a PDF file upload and return extracted text.
    Frontend calls this first, then uses the text in /extract-skills.
    """

    # guard: must be a PDF
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    # guard: file size limit (2MB)
    MAX_SIZE = 2 * 1024 * 1024  # 2MB in bytes
    contents = await file.read()

    if len(contents) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail="PDF is too large. Please upload a file under 2MB."
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    try:
        text = extract_text_from_pdf(io.BytesIO(contents))
        return {
            "text": text,
            "filename": file.filename,
            "char_count": len(text)
        }
    except ValueError as e:
        # our own validation errors from pdf_parser
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"[parse-pdf] {str(e)}"
        )

@app.post("/assessment/start")
def start_assessment_route(request: StartAssessmentRequest):
    if not request.missing_skills:
        raise HTTPException(status_code=400, detail="No skills to assess")
    try:
        state = start_assessment(request.missing_skills)
        sessions[request.session_id] = state
        return state_to_dict(state)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"[assessment/start] {str(e)}")


@app.post("/assessment/continue")
def continue_assessment_route(request: ContinueAssessmentRequest):
    if request.session_id not in sessions:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Call /assessment/start first."
        )
    try:
        state = sessions[request.session_id]
        state = continue_assessment(state, request.answer)
        sessions[request.session_id] = state
        return state_to_dict(state)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"[assessment/continue] {str(e)}")


@app.get("/assessment/state/{session_id}")
def get_session_state(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        state = sessions[session_id]
        return state_to_dict(state)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"[assessment/state] {str(e)}")

@app.post("/gap-analysis")
def gap_analysis_route(request: GapAnalysisRequest):
    if not request.jd_skills:
        raise HTTPException(status_code=400, detail="JD skills cannot be empty")
    try:
        result = generate_gap_analysis(
            jd_skills=request.jd_skills,
            resume_skills=request.resume_skills,
            scores=request.scores
        )
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"[gap-analysis] {str(e)}")


@app.post("/learning-plan")
def learning_plan_route(request: LearningPlanRequest):
    if not request.jd_skills:
        raise HTTPException(status_code=400, detail="JD skills cannot be empty")
    try:
        gap = generate_gap_analysis(
            jd_skills=request.jd_skills,
            resume_skills=request.resume_skills,
            scores=request.scores
        )
        plan = generate_learning_plan(
            candidate_name=request.candidate_name,
            scores=request.scores,
            gap_analysis=gap,
            resume_skills=request.resume_skills
        )
        return {
            "gap_analysis": gap,
            "learning_plan": plan
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"[learning-plan] {str(e)}")
    

