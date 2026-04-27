// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Upload from './pages/Upload'
import Assessment from './pages/Assessment'
import Results from './pages/Results'

// ── Route guard ───────────────────────────────────────────────
function ProtectedRoute({ children, requiresExtraction, requiresAssessment }) {
  const { extractionDone, assessmentDone } = useApp()

  if (requiresAssessment && !assessmentDone) {
    return <Navigate to="/upload" replace />
  }

  if (requiresExtraction && !extractionDone) {
    return <Navigate to="/upload" replace />
  }

  return children
}

// ── 404 Page ──────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400 text-lg">404 — Page not found.</p>
      
        <a href="/upload"
        className="text-blue-400 hover:text-blue-300 underline text-sm"
      >
        Go back to start
      </a>
    </div>
  )
}

// ── Routes ────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/upload" replace />} />

      <Route path="/upload" element={<Upload />} />

      <Route
        path="/assessment"
        element={
          <ProtectedRoute requiresExtraction>
            <Assessment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/results"
        element={
          <ProtectedRoute requiresAssessment>
            <Results />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-screen bg-gray-950">
          <AppRoutes />
        </div>
      </AppProvider>
    </BrowserRouter>
  )
}