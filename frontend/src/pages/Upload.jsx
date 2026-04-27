// frontend/src/pages/Upload.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractSkills } from '../api/client'
import { useApp } from '../context/AppContext'
import ErrorBanner from '../components/ErrorBanner'
import FileUpload from '../components/FileUpload'

const LIMITS = {
  name: 100,
  jd: 5000,
  resume: 5000,
}

function FieldLabel({ label, current, max }) {
  const isNearLimit = current > max * 0.85
  const isAtLimit = current >= max
  return (
    <div className="flex justify-between items-center mb-1">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <span className={`text-xs ${
        isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-gray-500'
      }`}>
        {current}/{max}
      </span>
    </div>
  )
}

export default function Upload() {
  const navigate = useNavigate()
  const { setExtractionResult, resetAll } = useApp()

  const [name, setName] = useState('')
  const [jd, setJd] = useState('')
  const [resume, setResume] = useState('')
  const [resumeMode, setResumeMode] = useState('paste')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function validate() {
    if (!name.trim()) return 'Please enter your name.'
    if (name.trim().length > LIMITS.name) return `Name must be under ${LIMITS.name} characters.`
    if (!jd.trim()) return 'Please paste the Job Description.'
    if (jd.trim().length < 50) return 'Job Description seems too short. Please paste the full JD.'
    if (jd.trim().length > LIMITS.jd) return `Job Description must be under ${LIMITS.jd} characters.`
    if (!resume.trim()) return 'Please paste or upload your Resume.'
    if (resume.trim().length < 50) return 'Resume seems too short. Please paste your full resume.'
    if (resume.trim().length > LIMITS.resume) return `Resume must be under ${LIMITS.resume} characters.`
    return null
  }

  async function handleSubmit() {
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      // reset any previous session data
      resetAll()

      const result = await extractSkills(jd.trim(), resume.trim())

      if (!result.jd_skills?.length && !result.resume_skills?.length) {
        setError('Could not extract any skills. Try a more detailed JD and Resume.')
        return
      }

      if (!result.missing_skills?.length) {
        setError('No skill gaps found — your resume already matches this JD!')
        return
      }

      // store in context
      setExtractionResult({
        candidateName: name.trim(),
        jdSkills: result.jd_skills,
        resumeSkills: result.resume_skills,
        missingSkills: result.missing_skills,
        matchedSkills: result.matched_skills,
      })

      navigate('/assessment')

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Skill Gap Agent
        </h1>
        <p className="text-gray-400 mt-2 text-base">
          Paste your Job Description and Resume to get started.
        </p>
      </div>

      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col gap-6">

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* Name */}
        <div>
          <FieldLabel label="Your Name" current={name.length} max={LIMITS.name} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={LIMITS.name}
            placeholder="e.g. Rahul Sharma"
            disabled={loading}
            className="
              w-full bg-gray-800 border border-gray-700 rounded-lg
              px-4 py-2.5 text-white placeholder-gray-500
              focus:outline-none focus:border-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors
            "
          />
        </div>

        {/* Job Description */}
        <div>
          <FieldLabel label="Job Description" current={jd.length} max={LIMITS.jd} />
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            maxLength={LIMITS.jd}
            placeholder="Paste the full job description here..."
            rows={6}
            disabled={loading}
            className="
              w-full bg-gray-800 border border-gray-700 rounded-lg
              px-4 py-3 text-white placeholder-gray-500
              focus:outline-none focus:border-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none transition-colors
            "
          />
        </div>

        {/* Resume */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-300">
              Your Resume
            </label>
            <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => { setResumeMode('paste'); setResume('') }}
                disabled={loading}
                className={`
                  text-xs px-3 py-1 rounded-md transition-colors
                  ${resumeMode === 'paste' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-gray-200'}
                  disabled:opacity-50
                `}
              >
                Paste
              </button>
              <button
                type="button"
                onClick={() => { setResumeMode('upload'); setResume('') }}
                disabled={loading}
                className={`
                  text-xs px-3 py-1 rounded-md transition-colors
                  ${resumeMode === 'upload' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-gray-200'}
                  disabled:opacity-50
                `}
              >
                Upload PDF
              </button>
            </div>
          </div>

          {resumeMode === 'paste' && (
            <>
              <div className="flex justify-end mb-1">
                <span className={`text-xs ${
                  resume.length >= LIMITS.resume ? 'text-red-400'
                  : resume.length > LIMITS.resume * 0.85 ? 'text-yellow-400'
                  : 'text-gray-500'
                }`}>
                  {resume.length}/{LIMITS.resume}
                </span>
              </div>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                maxLength={LIMITS.resume}
                placeholder="Paste your resume content here..."
                rows={6}
                disabled={loading}
                className="
                  w-full bg-gray-800 border border-gray-700 rounded-lg
                  px-4 py-3 text-white placeholder-gray-500
                  focus:outline-none focus:border-blue-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  resize-none transition-colors
                "
              />
            </>
          )}

          {resumeMode === 'upload' && (
            <FileUpload
              onTextExtracted={(text) => setResume(text)}
              disabled={loading}
            />
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="
            w-full bg-blue-600 hover:bg-blue-500
            disabled:bg-blue-900 disabled:cursor-not-allowed
            text-white font-semibold rounded-lg
            py-3 px-6 transition-colors
            flex items-center justify-center gap-2
          "
        >
          {loading ? (
            <>
              <span className="animate-spin text-lg">⟳</span>
              Extracting Skills...
            </>
          ) : (
            'Analyse Skills →'
          )}
        </button>
      </div>

      <p className="text-gray-600 text-xs mt-6 text-center">
        Your data is only used for this session and never stored permanently.
      </p>
    </div>
  )
}