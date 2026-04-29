import React, { useContext } from 'react'
import AppContext from '../utils/AppContext'
import './IntegrationPage.css'

export default function IntegrationPage({ context }) {
  const { boardId } = context || {}

  const integrationRecipes = [
    {
      id: 1,
      name: 'Status Change',
      description: 'Gửi email khi giá trị của cột trạng thái thay đổi',
      icon: '🔄'
    },
    {
      id: 2,
      name: 'Date Reached',
      description: 'Gửi email khi đến ngày đáo hạn',
      icon: '📅'
    },
    {
      id: 3,
      name: 'Person Assigned',
      description: 'Gửi email khi item được gán cho người',
      icon: '👤'
    },
    {
      id: 4,
      name: 'Item Created',
      description: 'Gửi email khi item mới được tạo',
      icon: '➕'
    },
    {
      id: 5,
      name: 'Item Updated',
      description: 'Gửi email khi item được cập nhật',
      icon: '✏️'
    },
    {
      id: 6,
      name: 'Button Click',
      description: 'Gửi email khi button được click',
      icon: '🔘'
    }
  ]

  return (
    <div className="page-container integration-page">
      <div className="page-header">
        <h2>⚡ Tích Hợp Tự Động</h2>
        <p>Cấu hình quy trình tự động gửi email</p>
      </div>

      <div className="integration-recipes">
        {integrationRecipes.map((recipe) => (
          <div key={recipe.id} className="recipe-card">
            <div className="recipe-icon">{recipe.icon}</div>
            <div className="recipe-content">
              <h3>{recipe.name}</h3>
              <p>{recipe.description}</p>
            </div>
            <button className="recipe-btn">Cấu hình</button>
          </div>
        ))}
      </div>
    </div>
  )
}
