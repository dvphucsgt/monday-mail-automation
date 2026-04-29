import React, { useContext } from 'react'
import AppContext from '../utils/AppContext'
import './SettingsPage.css'

export default function SettingsPage({ context }) {
  return (
    <div className="page-container settings-page">
      <div className="page-header">
        <h2>⚙️ Cài Đặt</h2>
        <p>Quản lý tài khoản và cài đặt ứng dụng</p>
      </div>

      <div className="settings-sections">
        <div className="settings-section">
          <h3>Tài khoản Email</h3>
          <div className="account-info">
            <div className="account-item">
              <span className="account-label">Provider:</span>
              <span className="account-value">Gmail</span>
            </div>
            <div className="account-item">
              <span className="account-label">Email:</span>
              <span className="account-value">dvphuc@saigon-tech.vn</span>
            </div>
            <div className="account-item">
              <span className="account-label">Trạng thái:</span>
              <span className="account-value connected">Đã kết nối</span>
            </div>
          </div>
          <button className="btn-disconnect">Ngắt kết nối</button>
        </div>

        <div className="settings-section">
          <h3>Thông tin Board</h3>
          <div className="board-info">
            <div className="board-item">
              <span className="board-label">Board ID:</span>
              <span className="board-value">{context?.boardId || 'N/A'}</span>
            </div>
            <div className="board-item">
              <span className="board-label">Workspace:</span>
              <span className="board-value">Main workspace</span>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Thông báo</h3>
          <div className="notification-settings">
            <label className="notification-item">
              <input type="checkbox" defaultChecked />
              <span>Nhận thông báo khi email gửi thành công</span>
            </label>
            <label className="notification-item">
              <input type="checkbox" defaultChecked />
              <span>Nhận thông báo khi email gửi thất bại</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
