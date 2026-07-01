import { useState } from 'react'

// ---------------------------------------------------------------------------
// parseSections
// Splits Claude's response into the top-level numbered sections (1–7).
//
// Guard against false positives: a numbered line is only treated as a
// section header when it is preceded by a blank line (or the start of text).
// This prevents numbered list items inside section content from consuming a
// section slot (e.g. "6. Step six" inside section 5 must NOT become Section 6).
// ---------------------------------------------------------------------------
function parseSections(text) {
  const lines = text.split('\n')
  const sections = []
  let currentHeader = null
  let currentLines = []
  let lastSectionNum = 0
  let prevWasBlank = true // start of text counts as blank

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      prevWasBlank = true
      if (currentHeader !== null) currentLines.push(line)
      continue
    }

    // Only attempt a section-header match when preceded by a blank line.
    // Accepts: "1. Title", "**1. Title**", "## 1. Title"
    if (prevWasBlank) {
      const match = trimmed.match(
        /^(?:\*{1,2}|#{1,3}\s*)?(\d+)\.\s+(.+?)(?:\*{1,2})?:?\s*$/
      )
      if (match) {
        const num = parseInt(match[1], 10)
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

  if (currentHeader !== null) {
    sections.push({ header: currentHeader, lines: currentLines })
  }

  return sections.length >= 3 ? sections : null
}

// ---------------------------------------------------------------------------
// renderContent
// Renders the content lines of a single section into React elements.
// Handles, in priority order:
//   1. Blank lines             → skip
//   2. Horizontal rules        → skip  (--- / *** / ___)
//   3. Markdown headings       → <p class="content-subheading">  (### Foo)
//   4. Decimal sub-sections    → <p class="content-subheading">  (5.1 Foo)
//   5. Numbered list items     → <ol><li>  (1. Foo)
//   6. Bullet list items       → <ul><li>  (- Foo)
//   7. Everything else         → <p>
// ---------------------------------------------------------------------------
function renderContent(lines) {
  const allLines = lines.join('\n').split('\n')
  const result = []
  let i = 0
  let key = 0

  // Helper: peek past blank lines and return index of next non-blank, or -1
  const nextNonBlank = (from) => {
    let j = from
    while (j < allLines.length && !allLines[j].trim()) j++
    return j < allLines.length ? j : -1
  }

  while (i < allLines.length) {
    const trimmed = allLines[i].trim()

    // 1. blank line
    if (!trimmed) { i++; continue }

    // 2. horizontal rule  (--- / *** / ___ / -- etc.)
    if (/^[-*_]{2,}\s*$/.test(trimmed)) { i++; continue }

    // 3. markdown heading  (# / ## / ### ...)
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

    // 4. decimal sub-section  (5.1 Title, **5.1 Title**, 5.2 Title …)
    //    Strip any leading/trailing asterisks before matching so Claude's bold
    //    markers (**5.1 Foo**) don't cause the line to fall through to a plain <p>.
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

    // 5. numbered list item  (1. Foo)
    //    Note: "5.1 Foo" does NOT match because after \d+\. the next char is
    //    a digit, not whitespace — so decimal sub-sections can't steal this branch.
    if (/^\d+\.\s+\S/.test(trimmed)) {
      const items = []
      while (i < allLines.length) {
        const t = allLines[i].trim()
        if (/^\d+\.\s+\S/.test(t)) {
          items.push(t.replace(/^\d+\.\s+/, ''))
          i++
        } else if (!t) {
          // continue across a single blank line if next non-blank is also numbered
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

    // 6. bullet list item  (- Foo / • Foo / * Foo)
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

    // 7. regular prose paragraph — collect until blank line or special line
    const paraLines = []
    while (i < allLines.length) {
      const t = allLines[i].trim()
      if (!t) { i++; break }
      if (
        /^[-*_]{2,}\s*$/.test(t) ||          // horizontal rule
        /^#{1,6}\s/.test(t) ||               // markdown heading
        /^\d+\.\d+\s+[A-Z]/.test(t) ||      // decimal sub-section
        /^\d+\.\s+\S/.test(t) ||             // numbered list
        /^[-•*]\s+\S/.test(t)                // bullet
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

// ---------------------------------------------------------------------------
// DraftOutput component
// ---------------------------------------------------------------------------
function DraftOutput({ draft }) {
  const [copied, setCopied] = useState(false)

  const sections = parseSections(draft)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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
      <div className="draft-output-header">
        <h2>Disclosure Draft</h2>
        <div className="draft-actions">
          <button
            className={`action-btn action-btn-outline${copied ? ' copy-btn-success' : ''}`}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button className="action-btn action-btn-solid" onClick={() => window.print()}>
            Save as PDF
          </button>
        </div>
      </div>

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
