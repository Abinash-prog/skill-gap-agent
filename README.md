# Skill Gap Agent

AI-powered skill assessment + personalized learning plan generator.

Upload a Job Description and your Resume. The AI extracts required skills, interviews you conversationally to verify real proficiency, identifies your gaps, and generates a week-by-week personalized learning plan with curated resources.

## Live Links

- **Frontend:** https://your-app.vercel.app
- **Backend:** https://your-api.onrender.com
- **GitHub:** https://github.com/Abinash-prog/skill-gap-agent
- **Demo Video:** your-demo-link-here

## Workflow

1. **Upload** — Paste JD + Resume or upload PDF
2. **Extract** — AI identifies skill gaps between JD requirements and your resume
3. **Assess** — Conversational AI interviews you per skill (or skip)
4. **Plan** — Personalized week-by-week learning roadmap with resources

## Tech Stack

**Backend:** FastAPI, Groq (Llama 3.3 70B), LangGraph, pdfplumber, Python 3.10+  
**Frontend:** React 18, Vite, React Router v6, Tailwind CSS  
**Deploy:** Render (backend) + Vercel (frontend)

## Local Setup

```bash
# 1. Clone
git clone https://github.com/Abinash-prog/skill-gap-agent.git
cd skill-gap-agent

# 2. Backend
cd backend
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt
echo "GROQ_API_KEY=your_key_here" > .env
uvicorn main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

Open http://localhost:5173

Get a free Groq API key at https://console.groq.com — no credit card needed.

## Environment Variables

| Variable | Where | Value |
|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | Your Groq API key |
| `VITE_API_URL` | `frontend/.env` | `http://localhost:8000` (local) |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/extract-skills` | Extract skills from JD + resume |
| POST | `/parse-pdf` | Upload PDF and extract text |
| POST | `/assessment/start` | Start assessment session |
| POST | `/assessment/continue` | Send answer, get next question |
| POST | `/learning-plan` | Generate gap analysis + roadmap |

## Features

- JD + Resume text input and PDF upload
- AI-powered skill extraction
- Conversational assessment with skip option
- Critical / adjacent / stretch skill classification
- Week-by-week learning plan with curated resources
- Full error handling and mobile responsive

## Author

Abinash — https://github.com/Abinash-prog