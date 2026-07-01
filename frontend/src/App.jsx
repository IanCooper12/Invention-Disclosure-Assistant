import { useState } from 'react'
import './App.css'
import DisclosureForm from './components/DisclosureForm'
import DraftOutput from './components/DraftOutput'

function App() {
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (formData) => {
    setLoading(true)
    setError(null)
    setDraft(null)
    try {
      const res = await fetch('http://localhost:8000/generate-disclosure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error (${res.status})`)
      }
      const data = await res.json()
      setDraft(data.draft)
    } catch (err) {
      if (err.message.includes('fetch') || err.message.includes('Failed')) {
        setError('Could not reach the server. Make sure the backend is running on port 8000.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <p className="header-eyebrow">Patent Drafting Tool</p>
        <h1>Invention Disclosure Assistant</h1>
        <p>
          Answer the questions below in plain language. Claude will restructure
          your description into a formal disclosure draft for your patent agent or attorney.
        </p>
      </header>

      <DisclosureForm onSubmit={handleSubmit} loading={loading} />

      {error && (
        <div className="error-banner" role="alert">
          <strong>Something went wrong</strong>
          {error}
        </div>
      )}

      {draft && <DraftOutput draft={draft} />}

      <footer className="app-footer">
        <p>This tool is a drafting aid only. It does not constitute legal advice.</p>
      </footer>
    </div>
  )
}

export default App
