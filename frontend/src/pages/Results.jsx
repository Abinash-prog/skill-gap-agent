// frontend/src/pages/Results.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateLearningPlan } from '../api/client'
import { useApp } from '../context/AppContext'
import ErrorBanner from '../components/ErrorBanner'

// ── Keep all sub-components exactly the same as Step 8 ───────
// scoreLabel, scoreBarColor, SectionHeader, ScoreCard,
// SkillPill, ResourceBadge, WeekCard, LoadingScreen
// ── Only the main Results() function changes ─────────────────

function scoreLabel(score) {
  if (score >= 7) return { text: 'Strong', color: 'text-green-400' }
  if (score >= 4) return { text: 'Moderate', color: 'text-yellow-400' }
  return { text: 'Needs Work', color: 'text-red-400' }
}

function scoreBarColor(score) {
  if (score >= 7) return 'bg-green-500'
  if (score >= 4) return 'bg-yellow-500'
  return 'bg-red-500'
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-white font-semibold text-lg">{title}</h2>
      {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
    </div>
  )
}

function ScoreCard({ skill, score }) {
  const label = scoreLabel(score)
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white text-sm font-medium">{skill}</span>
        <span className={`text-xs font-semibold ${label.color}`}>{label.text}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${scoreBarColor(score)}`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <p className="text-gray-500 text-xs mt-1 text-right">{score}/10</p>
    </div>
  )
}

function SkillPill({ skill, type }) {
  const styles = {
    critical: 'bg-red-900/40 text-red-300 border-red-700',
    adjacent: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    stretch: 'bg-purple-900/40 text-purple-300 border-purple-700',
    matched: 'bg-green-900/40 text-green-300 border-green-700',
  }
  return (
    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${styles[type] || styles.matched}`}>
      {skill}
    </span>
  )
}

function ResourceBadge({ type }) {
  const styles = {
    course: 'bg-blue-900/50 text-blue-300',
    docs: 'bg-gray-700 text-gray-300',
    video: 'bg-red-900/50 text-red-300',
    project: 'bg-green-900/50 text-green-300',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wide ${styles[type] || styles.docs}`}>
      {type}
    </span>
  )
}

function WeekCard({ week }) {
  const [open, setOpen] = useState(week.week === 1)
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="bg-blue-900 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
            Week {week.week}
          </span>
          <div>
            <p className="text-white font-medium text-sm">{week.skill_focus}</p>
            <p className="text-gray-400 text-xs mt-0.5">{week.goal}</p>
          </div>
        </div>
        <span className="text-gray-500 text-sm ml-4 shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-700 pt-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">⏱</span>
            <p className="text-gray-300 text-sm">
              <span className="text-white font-medium">{week.daily_hours}h/day</span> commitment
            </p>
          </div>

          {week.resources?.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Resources</p>
              <div className="flex flex-col gap-2">
                {week.resources.map((r, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 bg-gray-900 rounded-lg px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      <ResourceBadge type={r.type} />
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2">
                          {r.title}
                        </a>
                      ) : (
                        <p className="text-gray-200 text-sm">{r.title}</p>
                      )}
                    </div>
                    {r.estimated_hours && (
                      <span className="text-gray-500 text-xs shrink-0 mt-1">~{r.estimated_hours}h</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {week.milestone && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-4 py-3">
              <p className="text-blue-300 text-xs font-medium uppercase tracking-wide mb-1">Milestone</p>
              <p className="text-gray-200 text-sm">{week.milestone}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <span className="animate-spin text-4xl">⟳</span>
      <p className="text-gray-400 text-sm">Generating your personalized learning plan...</p>
    </div>
  )
}

// ── Main Results Page ──────────────────────────────────────────
export default function Results() {
  const navigate = useNavigate()
  const {
    candidateName,
    jdSkills,
    resumeSkills,
    matchedSkills,
    missingSkills,
    scores,
    resetAll,
  } = useApp()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [gapAnalysis, setGapAnalysis] = useState(null)
  const [learningPlan, setLearningPlan] = useState(null)

  useEffect(() => {
    fetchPlan()
  }, [])

  async function fetchPlan() {
    setLoading(true)
    setError(null)

    try {
      const data = await generateLearningPlan(
        candidateName || 'Candidate',
        jdSkills,
        resumeSkills || [],
        scores
      )

      if (!data?.gap_analysis || !data?.learning_plan) {
        throw new Error('Incomplete response from server. Please try again.')
      }

      setGapAnalysis(data.gap_analysis)
      setLearningPlan(data.learning_plan)

    } catch (err) {
      setError(err.message || 'Failed to generate learning plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleStartOver() {
    resetAll()
    navigate('/upload')
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen pb-16">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 mb-8">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-semibold text-lg">Your Learning Plan</h1>
            <p className="text-gray-400 text-sm">
              {candidateName ? `Personalized for ${candidateName}` : 'Personalized for you'}
            </p>
          </div>
          <button
            onClick={handleStartOver}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ← Start Over
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 flex flex-col gap-10">

        {/* Error */}
        {error && (
          <div className="flex flex-col gap-3">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
            <button
              onClick={fetchPlan}
              className="
                self-start bg-gray-800 hover:bg-gray-700
                text-gray-300 text-sm px-4 py-2 rounded-lg
                transition-colors border border-gray-700
              "
            >
              ⟳ Retry
            </button>
          </div>
        )}

        {/* Scores */}
        {scores && Object.keys(scores).length > 0 && (
          <section>
            <SectionHeader
              title="Assessment Scores"
              subtitle="Your proficiency in each assessed skill"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(scores).map(([skill, score]) => (
                <ScoreCard key={skill} skill={skill} score={score} />
              ))}
            </div>
          </section>
        )}

        {/* Gap Analysis */}
        {gapAnalysis && (
          <section>
            <SectionHeader title="Skill Gap Analysis" subtitle={gapAnalysis.summary} />
            <div className="flex flex-col gap-4">
              {matchedSkills?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">✓ Already Have</p>
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.map((s) => <SkillPill key={s} skill={s} type="matched" />)}
                  </div>
                </div>
              )}
              {gapAnalysis.critical?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">✗ Critical Gaps</p>
                  <div className="flex flex-wrap gap-2">
                    {gapAnalysis.critical.map((s) => <SkillPill key={s} skill={s} type="critical" />)}
                  </div>
                </div>
              )}
              {gapAnalysis.adjacent?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">↗ Quick Wins</p>
                  <div className="flex flex-wrap gap-2">
                    {gapAnalysis.adjacent.map((s) => <SkillPill key={s} skill={s} type="adjacent" />)}
                  </div>
                </div>
              )}
              {gapAnalysis.stretch?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">⟳ Long Term</p>
                  <div className="flex flex-wrap gap-2">
                    {gapAnalysis.stretch.map((s) => <SkillPill key={s} skill={s} type="stretch" />)}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Learning Plan */}
        {learningPlan?.weekly_plan?.length > 0 && (
          <section>
            <SectionHeader
              title={`${learningPlan.total_weeks}-Week Learning Roadmap`}
              subtitle="Click each week to expand resources and milestones"
            />
            <div className="flex flex-col gap-3">
              {learningPlan.weekly_plan.map((week) => (
                <WeekCard key={week.week} week={week} />
              ))}
            </div>
          </section>
        )}

        {/* No plan fallback */}
        {learningPlan?.note && !learningPlan?.weekly_plan?.length && (
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-6 text-center">
            <p className="text-green-300 font-medium">{learningPlan.note}</p>
          </div>
        )}

        {/* Start Over */}
        <div className="text-center pt-4">
          <button
            onClick={handleStartOver}
            className="
              bg-gray-800 hover:bg-gray-700 border border-gray-700
              text-gray-300 font-medium rounded-lg
              px-6 py-3 transition-colors text-sm
            "
          >
            ← Assess Another Role
          </button>
        </div>

      </div>
    </div>
  )
}