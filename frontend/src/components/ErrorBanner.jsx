// frontend/src/components/ErrorBanner.jsx

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null

  return (
    <div className="w-full bg-red-900/50 border border-red-500 rounded-lg px-4 py-3 flex items-start justify-between gap-4">
      <div className="flex items-start gap-2">
        <span className="text-red-400 mt-0.5">⚠</span>
        <p className="text-red-300 text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-200 text-lg leading-none shrink-0"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  )
}