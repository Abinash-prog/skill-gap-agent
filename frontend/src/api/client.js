// frontend/src/api/client.js

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Core fetch wrapper ────────────────────────────────────────
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)

    // try to parse JSON regardless of status
    let data
    try {
      data = await response.json()
    } catch {
      data = { detail: 'Server returned non-JSON response' }
    }

    if (!response.ok) {
      // FastAPI sends errors as { detail: "..." }
      const message = data?.detail || `Request failed with status ${response.status}`
      throw new Error(message)
    }

    return data

  } catch (err) {
    // network error (server down, no internet, etc.)
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Cannot reach server. Make sure the backend is running on port 8000.')
    }
    // re-throw everything else as-is
    throw err
  }
}


// ── API calls ─────────────────────────────────────────────────

/**
 * Extract skills from JD and Resume text
 * @param {string} jd - Job description text
 * @param {string} resume - Resume text
 */
export async function extractSkills(jd, resume) {
  return request('/extract-skills', {
    method: 'POST',
    body: JSON.stringify({ jd, resume }),
  })
}


/**
 * Start a new assessment session
 * @param {string} sessionId - Unique session identifier
 * @param {string[]} missingSkills - Skills to assess
 */
export async function startAssessment(sessionId, missingSkills) {
  return request('/assessment/start', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      missing_skills: missingSkills,
    }),
  })
}


/**
 * Send candidate answer and get next question
 * @param {string} sessionId - Existing session identifier
 * @param {string} answer - Candidate's answer
 */
export async function continueAssessment(sessionId, answer) {
  return request('/assessment/continue', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      answer,
    }),
  })
}


/**
 * Generate gap analysis and learning plan
 * @param {string} candidateName
 * @param {string[]} jdSkills
 * @param {string[]} resumeSkills
 * @param {Object} scores - { skill: score }
 */
export async function generateLearningPlan(candidateName, jdSkills, resumeSkills, scores) {
  return request('/learning-plan', {
    method: 'POST',
    body: JSON.stringify({
      candidate_name: candidateName,
      jd_skills: jdSkills,
      resume_skills: resumeSkills,
      scores,
    }),
  })
}

// frontend/src/api/client.js

// ... all existing functions stay exactly the same ...

/**
 * Upload a PDF resume and get extracted text back
 * @param {File} file - PDF File object from input
 * @returns {{ text: string, filename: string, char_count: number }}
 */
export async function parsePdfResume(file) {
  const url = `${BASE_URL}/parse-pdf`

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch(url, {
      method: 'POST',
      // do NOT set Content-Type header — browser sets it with boundary automatically
      body: formData,
    })

    let data
    try {
      data = await response.json()
    } catch {
      data = { detail: 'Server returned non-JSON response' }
    }

    if (!response.ok) {
      const message = data?.detail || `Upload failed with status ${response.status}`
      throw new Error(message)
    }

    return data

  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Cannot reach server. Make sure the backend is running on port 8000.')
    }
    throw err
  }
}