import React, { useContext } from 'react'
import AppContext from '../utils/AppContext'
import TemplateList from '../components/TemplateList.jsx'
import './TemplatesPage.css'

export default function TemplatesPage({ context }) {
  const { boardId } = context || {}

  return (
    <div className="page-container templates-page">
      <div className="page-header">
        <h2>📧 Mẫu Email</h2>
        <p>Quản lý các mẫu email để gửi tự động</p>
      </div>

      <TemplateList boardId={boardId} />
    </div>
  )
}
