import React from 'react'
import TemplateList from '../components/TemplateList.jsx'

export default function TemplatesPage({ context, sessionToken }) {
  // Use a fallback boardId for local development when testing outside Monday.com
  const boardId = context?.boardId || 'local-test-board'

  return (
    <TemplateList boardId={boardId} sessionToken={sessionToken} />
  )
}
