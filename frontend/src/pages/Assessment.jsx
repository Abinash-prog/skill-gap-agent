// frontend/src/pages/Assessment.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { startAssessment, continueAssessment } from '../api/client'
import { useApp } from '../context/AppContext'
import ChatBubble from '../components/ChatBubble'
import ErrorBanner from '../components/ErrorBanner'

function SkillProgress({ skills, currentSkill, scores }) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
      {skills.map((skill) => {
        const isDone = skill in scores
        const isCurrent = skill === currentSkill
        return (
          <span
            key={skill}
            className={`
              text-xs px-2.5 py-1 rounded-full font-medium transition-colors
              ${isDone
                ? 'bg-green-900 text-green-300 border border-green-700'
                : isCurrent
                ? 'bg-blue-900 text-blue-300 border border-blue-600 animate-pulse'
                : 'bg-gray-800 text-gray-500 border border-gray-700'}
            `}
          >
            {isDone ? `✓ ${skill}` : isCurrent ? `● ${skill}` : skill}
          </span>
        )
      })}
    </div>
  )
}

export default function Assessment() {
  const navigate = useNavigate()
  const {
    candidateName,
    jdSkills,
    resumeSkills,
    missingSkills,
    matchedSkills,
    setAssessmentResult,
  } = useApp()

  const [messages, setMessages] = useState([])
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const [currentSkill, setCurrentSkill] = useState('')
  const [scores, setScores] = useState({})
  const [assessmentComplete, setAssessmentComplete] = useState(false)
  const [started, setStarted] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!missingSkills?.length || started) return

    async function begin() {
      setStarted(true)
      setLoading(true)
      setError(null)

      try {
        const data = await startAssessment(sessionId, missingSkills)

        if (!data?.question) {
          throw new Error('Agent did not return a question. Please try again.')
        }

        setMessages([{ role: 'assistant', content: data.question }])
        setCurrentSkill(data.current_skill || missingSkills[0])
        setScores(data.scores || {})

      } catch (err) {
        setError(err.message || 'Failed to start assessment. Please go back and try again.')
        setStarted(false)
      } finally {
        setLoading(false)
      }
    }

    begin()
  }, [missingSkills, sessionId, started])

  async function handleSend() {
    const trimmed = answer.trim()
    if (!trimmed) { setError('Please type an answer before sending.'); return }
    if (trimmed.length < 3) { setError('Answer is too short. Please elaborate.'); return }
    if (trimmed.length > 2000) { setError('Answer is too long. Keep it under 2000 characters.'); return }
    if (loading || assessmentComplete) return

    setError(null)
    setAnswer('')
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setLoading(true)

    try {
      const data = await continueAssessment(sessionId, trimmed)

      if (!data?.question && !data?.assessment_complete) {
        throw new Error('Unexpected response from agent. Please try again.')
      }

      if (data.question) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.question }])
      }

      setCurrentSkill(data.current_skill || currentSkill)
      setScores(data.scores || scores)

      if (data.assessment_complete) {
        setAssessmentComplete(true)
      }

    } catch (err) {
      setMessages((prev) => prev.slice(0, -1))
      setAnswer(trimmed)
      setError(err.message || 'Failed to send answer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Skip handler ───────────────────────────────────────────
  function handleSkip() {
    const defaultScores = {}
    missingSkills.forEach((skill) => { defaultScores[skill] = 0 })
    matchedSkills?.forEach((skill) => { defaultScores[skill] = 7 })

    // store in context before navigating
    setAssessmentResult(defaultScores)
    navigate('/results')
  }

  // ── Complete handler ───────────────────────────────────────
  function handleViewResults() {
    // store real scores in context before navigating
    setAssessmentResult(scores)
    navigate('/results')
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white font-semibold text-lg">Skill Assessment</h1>
              <p className="text-gray-400 text-sm">
                Hi {candidateName} — answer each question honestly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!assessmentComplete && (
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="
                    text-sm text-yellow-400 hover:text-yellow-300
                    border border-yellow-700 hover:border-yellow-500
                    px-3 py-1.5 rounded-lg transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  Skip →
                </button>
              )}
              <button
                onClick={() => navigate('/upload')}
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                ← Start Over
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Skill Progress */}
      <div className="max-w-2xl mx-auto w-full">
        <SkillProgress
          skills={missingSkills}
          currentSkill={currentSkill}
          scores={scores}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          {messages.map((msg, idx) => (
            <ChatBubble key={idx} role={msg.role} content={msg.content} />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Agent</p>
                <div className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {assessmentComplete && !loading && (
            <div className="bg-green-900/30 border border-green-700 rounded-2xl p-5 text-center">
              <p className="text-green-300 font-semibold text-base mb-1">
                Assessment Complete 🎉
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Your personalized learning plan is ready.
              </p>
              <button
                onClick={handleViewResults}
                className="
                  bg-green-600 hover:bg-green-500 text-white
                  font-semibold rounded-lg px-6 py-2.5 transition-colors
                "
              >
                View Learning Plan →
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto w-full px-4 pb-2">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Input */}
      {!assessmentComplete && (
        <div className="bg-gray-900 border-t border-gray-800 px-4 py-4">
          <div className="max-w-2xl mx-auto flex gap-3 items-end">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
              rows={2}
              maxLength={2000}
              disabled={loading || assessmentComplete}
              className="
                flex-1 bg-gray-800 border border-gray-700 rounded-xl
                px-4 py-3 text-white placeholder-gray-500 text-sm
                focus:outline-none focus:border-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-none transition-colors
              "
            />
            <button
              onClick={handleSend}
              disabled={loading || assessmentComplete || !answer.trim()}
              className="
                bg-blue-600 hover:bg-blue-500
                disabled:bg-gray-700 disabled:cursor-not-allowed
                text-white rounded-xl px-4 py-3 transition-colors
                shrink-0 flex items-center justify-center
              "
            >
              {loading
                ? <span className="animate-spin text-lg">⟳</span>
                : <span className="text-lg">↑</span>
              }
            </button>
          </div>
          <div className="max-w-2xl mx-auto mt-1">
            <p className="text-xs text-gray-600 text-right">{answer.length}/2000</p>
          </div>
        </div>
      )}
    </div>
  )
}