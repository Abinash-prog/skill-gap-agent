import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

skill_extractor_prompt = """
You are an expert technical  recruiter and skill analyst.

You will be given a Job Description and a Candidate Resume.
Your job is to extract skills from both and return a JSON object.

Return ONLY valid JSON. No explanation. No markdown. No extra text.

Return this exact structire:
{{
"jd_skills": ["skill1","skill2",...],
"resume_skills":["skill1", "skill2",...],
"matched_skills":["skill1","skill2",...],
"missing_skills":["skill1", "skill2"]
}}

Rules:
- Keep skill name short and clean (e.g. "Python", "REST APIs", "System Design")
- matched_skills = skills present in both JD and resume
- missing_skills = skills in JD but NOT in resume
- Do not include generic words like "communication" or "teamwork" unless explicitly required in JD

Job Description:
{jd}

Resume:
{resume}
"""

def extract_skills(jd: str, resume: str) -> dict:

    prompt = skill_extractor_prompt.format(jd=jd, resume = resume)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1,
        max_tokens=2000
    )

    raw = response.choices[0].message.content.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)

