import { useState } from 'react'

// Split Claude's response into the top-level numbered sections (1-7)
// Only treats a line as a section header if it follows a blank line,
// which prevents numbered list items inside section content from being
// mistaken for section headers
function parseSections(text) {
  const lines = text.split('\n')
  const sections = []
  let currentHeader = null
  let currentLines = []
  let lastSectionNum = 0
  let prevWasBlank = true // treat start of text as blank

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      prevWasBlank = true
      if (currentHeader !== null) currentLines.push(line)
      continue
    }

    // Check for a section header only when preceded by a blank line
    // Accepts formats: "1. Title", "**1. Title**", "## 1. Title"
    if (prevWasBlank) {
      const match = trimmed.match(
        /^(?:\*{1,2}|#{1,3}\s*)?(\d+)\.\s+(.+?)(?:\*{1,2})?:?\s*$/
      )
      if (match) {
        const num = parseInt(match[1], 10)
        // Require sequential numbering to avoid false positives
        if (num >= 1 && num <= 7 && num === lastSectionNum + 1) {
          if (currentHeader !== null) {
            sections.push({ header: currentHeader, lines: currentLines })
          }
          currentHeader = `${num}. ${match[2]
            .replace(/\*+/g, '')
            .replace(/:$/, '')
            .trim()}`
          currentLines = []
          lastSectionNum = num
          prevWasBlank = false
          continue
        }
      }
    }

    if (currentHeader !== null) currentLines.push(line)
    prevWasBlank = false
  }

  // Save the last section
  if (currentHeader !== null) {
    sections.push({ header: currentHeader, lines: currentLines })
  }

  // Fall back to raw display if fewer than 3 sections were found
  return sections.length >= 3 ? sections : null
}

// Render the content lines of a single section into React elements
// Handles markdown headings, decimal sub-sections, numbered lists,
// bullet lists, horizontal rules, and plain paragraphs
function renderContent(lines) {
  const allLines = lines.join('\n').split('\n')
  const result = []
  let i = 0
  let key = 0

  // Return the index of the next non-blank line, or -1 if none
  const nextNonBlank = (from) => {
    let j = from
    while (j < allLines.length && !allLines[j].trim()) j++
    return j < allLines.length ? j : -1
  }

  while (i < allLines.length) {
    const trimmed = allLines[i].trim()

    // Skip blank lines
    if (!trimmed) { i++; continue }

    // Skip horizontal rules (--- / *** / __)
    if (/^[-*_]{2,}\s*$/.test(trimmed)) { i++; continue }

    // Markdown heading (### Foo) — strip # symbols and render as sub-heading
    const mdHeading = trimmed.match(/^#{1,6}\s+(.+)$/)
    if (mdHeading) {
      result.push(
        <p className="content-subheading" key={key++}>
          {mdHeading[1].replace(/\*+/g, '')}
        </p>
      )
      i++
      continue
    }

    // Decimal sub-section (5.1 Title, **5.1 Title**) — strip asterisks and render as sub-heading
    const decimalSub = trimmed.replace(/^\*+/, '').replace(/\*+$/, '')
      .match(/^(\d+\.\d+(?:\.\d+)?)\s+([A-Z].*)$/)
    if (decimalSub) {
      result.push(
        <p className="content-subheading" key={key++}>
          {decimalSub[1]} {decimalSub[2].replace(/\*+/g, '')}
        </p>
      )
      i++
      continue
    }

    // Numbered list (1. Foo) — collect consecutive items into an <ol>
    // Note: "5.1 Foo" does not match because \s follows the first period,
    // not a digit, so decimal sub-sections cannot trigger this branch
    if (/^\d+\.\s+\S/.test(trimmed)) {
      const items = []
      while (i < allLines.length) {
        const t = allLines[i].trim()
        if (/^\d+\.\s+\S/.test(t)) {
          items.push(t.replace(/^\d+\.\s+/, ''))
          i++
        } else if (!t) {
          // Continue the list across a single blank line if the next non-blank line is also a numbered item
          const j = nextNonBlank(i + 1)
          if (j !== -1 && /^\d+\.\s+\S/.test(allLines[j].trim())) {
            i = j
          } else {
            break
          }
        } else {
          break
        }
      }
      result.push(
        <ol key={key++}>
          {items.map((item, idx) => <li key={idx}>{item}</li>)}
        </ol>
      )
      continue
    }

    // Bullet list (- Foo / * Foo / • Foo) — collect consecutive items into a <ul>
    if (/^[-•*]\s+\S/.test(trimmed)) {
      const items = []
      while (i < allLines.length) {
        const t = allLines[i].trim()
        if (/^[-•*]\s+\S/.test(t)) {
          items.push(t.replace(/^[-•*]\s+/, ''))
          i++
        } else if (!t) {
          const j = nextNonBlank(i + 1)
          if (j !== -1 && /^[-•*]\s+\S/.test(allLines[j].trim())) {
            i = j
          } else {
            break
          }
        } else {
          break
        }
      }
      result.push(
        <ul key={key++}>
          {items.map((item, idx) => <li key={idx}>{item}</li>)}
        </ul>
      )
      continue
    }

    // Plain prose paragraph — collect lines until a blank line or special line type
    const paraLines = []
    while (i < allLines.length) {
      const t = allLines[i].trim()
      if (!t) { i++; break }
      if (
        /^[-*_]{2,}\s*$/.test(t) ||
        /^#{1,6}\s/.test(t) ||
        /^\d+\.\d+\s+[A-Z]/.test(t) ||
        /^\d+\.\s+\S/.test(t) ||
        /^[-•*]\s+\S/.test(t)
      ) break
      paraLines.push(t)
      i++
    }
    if (paraLines.length > 0) {
      result.push(<p key={key++}>{paraLines.join(' ')}</p>)
    }
  }

  return result.length > 0 ? result : null
}

function DraftOutput({ draft }) {
  const [copied, setCopied] = useState(false)

  // Parse the raw draft text into sections
  const sections = parseSections(draft)

  // Copy the raw draft text to the clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that block navigator.clipboard
      const el = document.createElement('textarea')
      el.value = draft
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="draft-output">
      {/* Header bar with title and action buttons */}
      <div className="draft-output-header">
        <h2>Disclosure Draft</h2>
        <div className="draft-actions">
          <button
            className={`action-btn action-btn-outline${copied ? ' copy-btn-success' : ''}`}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          {/* Save as PDF uses the browser's native print-to-PDF dialog */}
          <button className="action-btn action-btn-solid" onClick={() => window.print()}>
            Save as PDF
          </button>
        </div>
      </div>

      {/* Render parsed sections, or fall back to raw text if parsing failed */}
      {sections ? (
        <div className="draft-sections">
          {sections.map((section, i) => (
            <div className="draft-section" key={i}>
              <div className="draft-section-header">{section.header}</div>
              <div className="draft-section-content">
                {renderContent(section.lines)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <pre className="draft-raw">{draft}</pre>
      )}
    </div>
  )
}

export default DraftOutput
