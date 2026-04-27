// frontend/src/components/FileUpload.jsx
import { useRef, useState } from 'react'
import { parsePdfResume } from '../api/client'

export default function FileUpload({ onTextExtracted, disabled }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState(null)
  const [fileError, setFileError] = useState(null)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]

    // reset input so same file can be re-uploaded if needed
    e.target.value = ''

    if (!file) return

    // client side guards before hitting API
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Only PDF files are supported.')
      return
    }

    const MAX_SIZE = 2 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setFileError('File is too large. Max size is 2MB.')
      return
    }

    if (file.size === 0) {
      setFileError('File is empty.')
      return
    }

    setFileError(null)
    setUploading(true)
    setUploadedName(null)

    try {
      const result = await parsePdfResume(file)

      // guard: backend returned empty text
      if (!result?.text?.trim()) {
        throw new Error(
          'No text could be extracted from this PDF. ' +
          'Try pasting your resume manually instead.'
        )
      }

      setUploadedName(file.name)
      onTextExtracted(result.text)

    } catch (err) {
      setFileError(err.message || 'Failed to parse PDF. Try pasting manually.')
      onTextExtracted('')
    } finally {
      setUploading(false)
    }
  }

  function handleClick() {
    if (!disabled && !uploading) {
      inputRef.current?.click()
    }
  }

  function handleClear() {
    setUploadedName(null)
    setFileError(null)
    onTextExtracted('')
  }

  return (
    <div className="flex flex-col gap-2">

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload button or uploaded state */}
      {uploadedName ? (
        // File successfully uploaded
        <div className="flex items-center justify-between bg-green-900/30 border border-green-700 rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-sm">✓</span>
            <p className="text-green-300 text-sm truncate max-w-xs">
              {uploadedName}
            </p>
          </div>
          <button
            onClick={handleClear}
            disabled={disabled}
            className="text-gray-400 hover:text-gray-200 text-xs ml-3 shrink-0 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        // Upload trigger button
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || uploading}
          className="
            w-full border border-dashed border-gray-600
            hover:border-blue-500 hover:bg-blue-900/10
            disabled:opacity-50 disabled:cursor-not-allowed
            rounded-lg px-4 py-3 transition-colors
            flex items-center justify-center gap-2
          "
        >
          {uploading ? (
            <>
              <span className="animate-spin text-gray-400">⟳</span>
              <span className="text-gray-400 text-sm">Extracting text...</span>
            </>
          ) : (
            <>
              <span className="text-gray-400 text-lg">↑</span>
              <span className="text-gray-400 text-sm">
                Upload PDF resume (max 2MB)
              </span>
            </>
          )}
        </button>
      )}

      {/* File error */}
      {fileError && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <span>⚠</span>
          {fileError}
        </p>
      )}

    </div>
  )
}