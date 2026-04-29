import React, { useState, useEffect } from 'react'
import { monday } from 'monday-sdk-js'
import AppContext from './utils/AppContext.jsx'
import AuthPage from './pages/AuthPage.jsx'
import TemplatesPage from './pages/TemplatesPage.jsx'
import IntegrationPage from './pages/IntegrationPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

const mondaySDK = monday()

function App() {
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('auth')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    mondaySDK
      .get('context')
      .then((res) => {
        setContext(res.data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error getting context:', err)
        setLoading(false)
      })
  }, [])

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
    setCurrentPage('templates')
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Đang tải...</p>
      </div>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'auth':
        return <AuthPage onSuccess={handleAuthSuccess} context={context} />
      case 'templates':
        return <TemplatesPage context={context} />
      case 'integration':
        return <IntegrationPage context={context} />
      case 'settings':
        return <SettingsPage context={context} />
      default:
        return <AuthPage onSuccess={handleAuthSuccess} context={context} />
    }
  }

  return (
    <AppContext.Provider
      value={{
        context,
        currentPage,
        setCurrentPage,
        isAuthenticated,
        setIsAuthenticated
      }}
    >
      <div className="app-container">
        <nav className="app-nav">
          <h1>📧 Supermail</h1>
          {isAuthenticated && (
            <div className="nav-links">
              <button onClick={() => setCurrentPage('templates')}>
                Mẫu Email
              </button>
              <button onClick={() => setCurrentPage('integration')}>
                Tích Hợp
              </button>
              <button onClick={() => setCurrentPage('settings')}>
                Cài Đặt
              </button>
            </div>
          )}
        </nav>
        <main className="app-main">{renderPage()}</main>
      </div>
    </AppContext.Provider>
  )
}

export default App
