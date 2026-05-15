import React, { useState, useEffect } from 'react'
import mondaySdk from "monday-sdk-js";
import { ToastContainer, Bounce } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppContext from './utils/AppContext.jsx'
import AuthPage from './pages/AuthPage.jsx'
import TemplatesPage from './pages/TemplatesPage.jsx'
import IntegrationPage from './pages/IntegrationPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import Layout from './components/Layout.jsx'

const mondaySDK = mondaySdk();

function App() {
  const [context, setContext] = useState({ boardId: 'local-test-board' })
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionToken, setSessionToken] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const location = useLocation()

  useEffect(() => {
    // Listen to context changes
    mondaySDK.listen("context", (res) => {
      if (res.data) {
        setContext(res.data)
      }
    })

    // Promise-based initialization
    Promise.all([
      mondaySDK.get("sessionToken"),
      mondaySDK.get("context")
    ]).then(([tokenRes, contextRes]) => {
      if (tokenRes.data) {
        setSessionToken(tokenRes.data)
      }
      if (contextRes.data) {
        setContext(contextRes.data)
      }
      setLoading(false)
    }).catch(err => {
      console.error('Error during initialization:', err)
      setLoading(false)
    })

    // Fetch current user info separately
    mondaySDK.get("context").then(contextRes => {
      const ctx = contextRes.data
      if (!ctx) return
      const userId = ctx.user?.id || ctx.user?.userId || ctx.userId
      console.log('[App] Monday context:', ctx, 'extracted userId:', userId)
      if (userId) {
        mondaySDK.api(`
          query {
            users(ids: [${userId}]) {
              id
              name
              photo_thumb
            }
          }
        `).then(userRes => {
          const user = userRes?.data?.users?.[0]
          console.log('[App] Fetched user:', user)
          if (user) setCurrentUser(user)
        }).catch(err => console.error('Error fetching user:', err))
      }
    })

    // Value created for user
    mondaySDK.execute("valueCreatedForUser")
  }, [])

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <AppContext.Provider
      value={{
        context,
        currentUser,
        isAuthenticated,
        setIsAuthenticated
      }}
    >
      <Layout context={context}>
        <Routes>
          <Route path="/auth" element={<AuthPage onSuccess={handleAuthSuccess} context={context} />} />
          <Route
            path="/templates"
            element={<TemplatesPage context={context} sessionToken={sessionToken} />}
          />
          <Route
            path="/integrations"
            element={<IntegrationPage context={context} sessionToken={sessionToken} />}
          />
          <Route
            path="/settings"
            element={<SettingsPage context={context} />}
          />
          <Route path="/" element={<Navigate to={`/templates${location.search}`} replace />} />
        </Routes>
      </Layout>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        closeButton={false}
        pauseOnHover
        draggable
        progress={undefined}
        theme={"light"}
        transition={Bounce}
        style={{ zIndex: 999999999 }}
      />
    </AppContext.Provider>
  )
}

export default App
