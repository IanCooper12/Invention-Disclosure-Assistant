import { useState } from 'react'

const FIELDS = [
  {
    name: 'title',
    label: 'Title or working name',
    hint: 'A short, descriptive name — it can change later.',
    type: 'input',
    required: true,
  },
  {
    name: 'problem',
    label: 'What problem does this solve?',
    hint: 'Describe the gap, frustration, or limitation your invention addresses.',
    type: 'textarea',
    rows: 4,
    required: true,
  },
  {
    name: 'how_it_works',
    label: 'How does it work?',
    hint: 'Explain it like you\'re talking to a smart friend, not a lawyer.',
    type: 'textarea',
    rows: 5,
    required: true,
  },
  {
    name: 'what_is_different',
    label: 'What makes your approach different?',
    hint: 'What does your invention do that existing solutions don\'t or can\'t?',
    type: 'textarea',
    rows: 4,
    required: true,
  },
  {
    name: 'prior_art',
    label: 'Are you aware of anything similar that already exists?',
    hint: 'Any products, patents, or papers you\'re aware of. Leave blank if none.',
    type: 'textarea',
    rows: 3,
    required: false,
  },
  {
    name: 'who_uses_it',
    label: 'Who would use this, and how?',
    hint: 'Describe the intended user and a typical use scenario.',
    type: 'textarea',
    rows: 3,
    required: false,
  },
]

const initialState = Object.fromEntries(FIELDS.map((f) => [f.name, '']))

function DisclosureForm({ onSubmit, loading }) {
  const [form, setForm] = useState(initialState)
  const [validationError, setValidationError] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (validationError) setValidationError(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const missing = FIELDS.filter((f) => f.required && !form[f.name].trim())
    if (missing.length > 0) {
      setValidationError(
        `Please fill in the required fields: ${missing.map((f) => f.label).join(', ')}.`
      )
      return
    }
    setValidationError(null)
    onSubmit(form)
  }

  return (
    <form className="disclosure-form" onSubmit={handleSubmit} noValidate>
      {FIELDS.map((field) => (
        <div className="form-field" key={field.name}>
          <label htmlFor={field.name}>
            {field.label}
            {!field.required && <span className="optional-tag">optional</span>}
          </label>
          <p className="field-hint">{field.hint}</p>
          {field.type === 'input' ? (
            <input
              id={field.name}
              name={field.name}
              value={form[field.name]}
              onChange={handleChange}
            />
          ) : (
            <textarea
              id={field.name}
              name={field.name}
              value={form[field.name]}
              onChange={handleChange}
              rows={field.rows}
            />
          )}
        </div>
      ))}

      {validationError && (
        <div className="error-banner" role="alert">
          <strong>Required fields missing</strong>
          {validationError}
        </div>
      )}

      <button className="submit-btn" type="submit" disabled={loading}>
        {loading ? 'Generating draft\u2026' : 'Generate Disclosure Draft'}
      </button>
    </form>
  )
}

export default DisclosureForm
