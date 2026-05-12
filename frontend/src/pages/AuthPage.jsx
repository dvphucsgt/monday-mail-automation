import React, { useState, useContext } from 'react'
import AppContext from '../utils/AppContext'
import './AuthPage.css'

export default function AuthPage({ onSuccess, context }) {
  const { setCurrentPage } = useContext(AppContext)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const boardId = context?.boardId || context?.boardIds?.[0]

  const handleGoogleAuth = async () => {
    setLoading(true)
    setError('')
    try {
      const authUrl = `${import.meta.env.VITE_BACKEND_URL}/auth/google?board_id=${boardId}`
      window.open(authUrl, '_blank', 'width=600,height=700')
    } catch (err) {
      setError('Không thể kết nối với Google. Vui lòng thử lại.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleMicrosoftAuth = async () => {
    setLoading(true)
    setError('')
    try {
      const authUrl = `${import.meta.env.VITE_BACKEND_URL}/auth/microsoft?board_id=${boardId}`
      window.open(authUrl, '_blank', 'width=600,height=700')
    } catch (err) {
      setError('Không thể kết nối với Microsoft. Vui lòng thử lại.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container auth-page">
      <div className="auth-content">
        <div className="auth-header">
          <h1>📧 AutomatedMail</h1>
          <p>Kết nối tài khoản email của bạn để bắt đầu</p>
        </div>

        <div className="auth-options">
          <button
            className="auth-btn google"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                d="M17.64 9.2c0-.637-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.715H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.159 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            {loading ? 'Đang kết nối...' : 'Kết nối với Google'}
          </button>

          <button
            className="auth-btn microsoft"
            onClick={handleMicrosoftAuth}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <rect x="0" y="0" width="8.5" height="8.5" fill="#f25022" />
              <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7fba00" />
              <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00a4ef" />
              <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#ffb900" />
            </svg>
            {loading ? 'Đang kết nối...' : 'Kết nối với Microsoft'}
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-info">
          <h3>Bạn có thể làm gì với AutomatedMail?</h3>
          <ul>
            <li>Tạo mẫu email có sẵn và gửi tự động</li>
            <li>Tích hợp với board Monday.com</li>
            <li>Gửi email khi trạng thái thay đổi</li>
            <li>Đính kèm file từ board hoặc máy tính</li>
            <li>Hỗ trợ nhiều mẫu trên cùng một board</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
