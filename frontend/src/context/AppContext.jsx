// frontend/src/context/AppContext.jsx
import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

// ── Initial empty state ───────────────────────────────────────
const INITIAL_STATE = {
  // candidate info
  candidateName: '',

  // skills from extract-skills
  jdSkills: [],
  resumeSkills: [],
  missingSkills: [],
  matchedSkills: [],

  // scores from assessment
  scores: {},

  // flow control
  extractionDone: false,
  assessmentDone: false,
}

export function AppProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE)

  // ── Updaters ────────────────────────────────────────────────

  function setExtractionResult({ candidateName, jdSkills, resumeSkills, missingSkills, matchedSkills }) {
    setState((prev) => ({
      ...prev,
      candidateName,
      jdSkills,
      resumeSkills,
      missingSkills,
      matchedSkills,
      extractionDone: true,
      // reset downstream state if user re-runs
      scores: {},
      assessmentDone: false,
    }))
  }

  function setAssessmentResult(scores) {
    setState((prev) => ({
      ...prev,
      scores,
      assessmentDone: true,
    }))
  }

  function resetAll() {
    setState(INITIAL_STATE)
  }

  return (
    <AppContext.Provider
      value={{
        ...state,
        setExtractionResult,
        setAssessmentResult,
        resetAll,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider')
  }
  return ctx
}