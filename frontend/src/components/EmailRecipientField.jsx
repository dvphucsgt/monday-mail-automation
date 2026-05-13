import React, { useState, useRef, useEffect } from 'react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailRecipientField({
  label,
  recipients = [],
  suggestions = [],
  onChange,
  error,
  placeholder = '',
}) {
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const filtered = inputValue.trim()
    ? suggestions.filter(
        s => s.toLowerCase().includes(inputValue.toLowerCase()) && !recipients.includes(s),
      )
    : suggestions.filter(s => !recipients.includes(s))

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addRecipient = (email) => {
    const trimmed = email.trim().toLowerCase()
    if (trimmed && !recipients.includes(trimmed)) {
      onChange([...recipients, trimmed])
    }
    setInputValue('')
    setShowDropdown(false)
    setFocusedIndex(-1)
    inputRef.current?.focus()
  }

  const removeRecipient = (email) => {
    onChange(recipients.filter(r => r !== email))
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      removeRecipient(recipients[recipients.length - 1])
      return
    }
    if (e.key === 'Enter' || (e.key === ',' && inputValue.trim())) {
      e.preventDefault()
      if (focusedIndex >= 0 && filtered[focusedIndex]) {
        addRecipient(filtered[focusedIndex])
      } else if (EMAIL_REGEX.test(inputValue.trim())) {
        addRecipient(inputValue.trim())
      }
      return
    }
    if (e.key === 'ArrowDown' && showDropdown) {
      e.preventDefault()
      setFocusedIndex(prev => Math.min(prev + 1, filtered.length - 1))
      return
    }
    if (e.key === 'ArrowUp' && showDropdown) {
      e.preventDefault()
      setFocusedIndex(prev => Math.max(prev - 1, -1))
      return
    }
    if (e.key === 'Escape') {
      setShowDropdown(false)
      setFocusedIndex(-1)
    }
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    if (val.includes(',')) {
      const parts = val.split(',').map(p => p.trim()).filter(Boolean)
      const validParts = parts.filter(p => EMAIL_REGEX.test(p))
      if (validParts.length) {
        const newRecipients = [...recipients]
        validParts.forEach(p => {
          const lower = p.toLowerCase()
          if (!newRecipients.includes(lower)) newRecipients.push(lower)
        })
        onChange(newRecipients)
        const remaining = parts.find(p => !EMAIL_REGEX.test(p)) || ''
        setInputValue(remaining)
      }
      return
    }
    setInputValue(val)
    setShowDropdown(val.trim().length > 0 || true)
    setFocusedIndex(-1)
  }

  const handleFocus = () => {
    setShowDropdown(true)
  }

  const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    backgroundColor: '#D2E4FF',
    borderRadius: 4,
    fontSize: 13,
    color: '#323338',
    whiteSpace: 'nowrap',
    lineHeight: '20px',
  }

  const chipRemoveStyle = {
    cursor: 'pointer',
    fontSize: 14,
    color: '#676879',
    lineHeight: 1,
    padding: '0 2px',
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 24px',
          minHeight: error ? 60 : 44,
          flexWrap: 'wrap',
          gap: 4,
          borderBottom: error ? 'none' : undefined,
        }}
      >
        <span style={{ fontSize: 14, color: '#676879', width: 40, flexShrink: 0, fontWeight: 400 }}>
          {label}
        </span>
        {recipients.map(email => (
          <span key={email} style={chipStyle}>
            {email}
            <span
              style={chipRemoveStyle}
              onClick={() => removeRecipient(email)}
              onMouseOver={e => (e.target.style.color = '#e44')}
              onMouseOut={e => (e.target.style.color = '#676879')}
            >
              ×
            </span>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={recipients.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: 120,
            border: 'none',
            outline: 'none',
            fontSize: 14,
            color: '#323338',
            padding: '4px 0',
            backgroundColor: 'transparent',
          }}
        />
      </div>
      {error && (
        <div style={{ paddingLeft: 64, paddingBottom: 6, fontSize: 12, color: '#e44', marginTop: -2 }}>
          {error}
        </div>
      )}
      {showDropdown && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 64,
            right: 24,
            backgroundColor: '#fff',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #E5E7EB',
            zIndex: 1000,
            maxHeight: 200,
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {filtered.slice(0, 20).map((email, idx) => (
            <div
              key={email}
              onClick={() => addRecipient(email)}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#D2E4FF'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 13,
                color: '#323338',
                backgroundColor: idx === focusedIndex ? '#D2E4FF' : 'transparent',
              }}
            >
              {email}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
