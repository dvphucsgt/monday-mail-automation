import React, { useState, useEffect } from 'react'
import './TemplateList.css'

export default function TemplateList({ boardId }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [boardId])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/templates?board_id=${boardId}`
      )
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = () => {
    setShowCreateModal(true)
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Bạn có chắc muốn xóa mẫu này?')) return

    try {
      await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/templates/${templateId}`,
        {
          method: 'DELETE'
        }
      )
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  if (loading) {
    return <div className="template-list-loading">Đang tải...</div>
  }

  return (
    <div className="template-list">
      <div className="template-list-header">
        <h3>Các mẫu email ({templates.length})</h3>
        <button className="btn-create" onClick={handleCreateTemplate}>
          + Tạo mẫu mới
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="template-empty">
          <div className="empty-icon">📧</div>
          <h4>Chưa có mẫu email nào</h4>
          <p>Tạo mẫu đầu tiên của bạn để bắt đầu</p>
          <button className="btn-create-primary" onClick={handleCreateTemplate}>
            Tạo mẫu mới
          </button>
        </div>
      ) : (
        <div className="template-grid">
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <h4>{template.name}</h4>
                <div className="template-actions">
                  <button className="btn-edit">✏️</button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="template-subject">
                <strong>Subject:</strong> {template.subject}
              </div>
              <div className="template-preview">
                {template.body?.substring(0, 150)}...
              </div>
              <div className="template-footer">
                <span className="template-date">
                  {new Date(template.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tạo Mẫu Email Mới</h3>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form className="template-form">
                <div className="form-group">
                  <label>Tên mẫu</label>
                  <input type="text" placeholder="VD: Gửi đề xuất" />
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <input type="text" placeholder="VD: Bản đề xuất cho {customer_name}" />
                </div>
                <div className="form-group">
                  <label>Nội dung email</label>
                  <textarea
                    rows="10"
                    placeholder="Soạn thảo nội dung email ở đây..."
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">
                    Lưu mẫu
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
