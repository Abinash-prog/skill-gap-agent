// frontend/src/components/ChatBubble.jsx

export default function ChatBubble({ role, content }) {
  const isAgent = role === 'assistant'

  return (
    <div
      className={`flex w-full ${isAgent ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${
            isAgent
              ? 'bg-gray-800 text-gray-100 rounded-tl-sm'
              : 'bg-blue-600 text-white rounded-tr-sm'
          }
        `}
      >
        {/* Agent label */}
        {isAgent && (
          <p className="text-xs text-gray-400 font-medium mb-1">
            Agent
          </p>
        )}
        {/* Message — preserve line breaks */}
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}