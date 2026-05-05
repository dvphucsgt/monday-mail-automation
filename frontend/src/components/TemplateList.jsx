import React, { useState, useEffect } from 'react'
import { Heading, Text } from '@vibe/typography'
import { Flex, Box } from '@vibe/layout'
import { EmptyState, Modal, ModalHeader, ModalContent, TextField, TextArea, Avatar, Tooltip } from '@vibe/core'
import AppContext from '../utils/AppContext'
import LoginModal from './LoginModal'
import { BASE_API_URL } from '../utils/constants'

const Button = ({ children, kind = 'primary', size = 'medium', onClick, style = {}, ...props }) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: size === 'small' ? '6px 12px' : '10px 20px',
    borderRadius: size === 'small' ? '6px' : '8px',
    fontSize: size === 'small' ? '13px' : '14px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    ...style
  }

  const kindStyles = {
    primary: {
      backgroundColor: 'var(--primary-color, #0073ea)',
      color: 'white'
    },
    secondary: {
      backgroundColor: 'white',
      color: 'var(--text-primary, #1a1a1a)',
      border: '1px solid var(--border-color, #e5e7eb)'
    },
    tertiary: {
      backgroundColor: 'transparent',
      color: 'var(--text-primary, #1a1a1a)'
    }
  }

  return (
    <button
      style={{ ...baseStyle, ...kindStyles[kind] }}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

export default function TemplateList({ boardId, sessionToken }) {
  const { currentUser } = React.useContext(AppContext)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const [authStatus, setAuthStatus] = useState({ authenticated: false })
  const [formData, setFormData] = useState({ subject: '', body: '' })

  useEffect(() => {
    fetchTemplates()
    fetchAuthStatus()
  }, [boardId])

  const fetchAuthStatus = async () => {
    if (!boardId) return
    try {
      const response = await fetch(
        `${BASE_API_URL}/auth/status?board_id=${boardId}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'ngrok-skip-browser-warning': '69420'
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setAuthStatus(data.data)
      }
    } catch (error) {
      console.error('Error fetching auth status:', error)
    }
  }

  const handleRemoveAccount = async () => {
    if (!boardId) return
    try {
      const response = await fetch(
        `${BASE_API_URL}/auth/remove?board_id=${boardId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'ngrok-skip-browser-warning': '69420'
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setAuthStatus({ authenticated: false })
        setShowAccountDropdown(false)
      }
    } catch (error) {
      console.error('Error removing account:', error)
    }
  }

  const fetchTemplates = async () => {
    if (!boardId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const response = await fetch(
        `${BASE_API_URL}/templates?board_id=${boardId}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'ngrok-skip-browser-warning': '69420'
          }
        }
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
    setFormData({ subject: '', body: '' })
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      await fetch(
        `${BASE_API_URL}/templates/${templateId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'ngrok-skip-browser-warning': '69420'
          }
        }
      )
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const handleSaveTemplate = async () => {
    try {
      const response = await fetch(
        `${BASE_API_URL}/templates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
            'ngrok-skip-browser-warning': '69420'
          },
          body: JSON.stringify({
            ...formData,
            board_id: boardId
          })
        }
      )
      if (response.ok) {
        setShowCreateModal(false)
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error saving template:', error)
    }
  }

  if (loading) {
    return (
      <Box style={{ padding: 24 }}>
        <Flex style={{ justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </Flex>
      </Box>
    )
  }

  return (
    <div className="template-list">
      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Create your first email template to get started"
          visual={
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="8" width="48" height="48" rx="8" stroke="#E5E7EB" strokeWidth="2" />
              <path d="M20 28H44M20 36H36M20 44H28" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
          mainAction={{
            text: 'Create Template',
            kind: 'primary',
            onClick: handleCreateTemplate
          }}
        />
      ) : (
        <>
          <Box style={{
            backgroundColor: '#F5F6F7',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 24,
            border: '1px solid #E5E7EB'
          }}>
            <Flex style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Heading style={{
                  fontSize: 18,
                  fontWeight: 600,
                  margin: 0,
                  color: '#1a1a1a',
                  letterSpacing: '-0.02em'
                }}>
                  Email Templates
                </Heading>
                <Text style={{
                  fontSize: 13,
                  color: '#6E7278',
                  marginTop: 4,
                  letterSpacing: '-0.01em'
                }}>
                  {templates.length} {templates.length === 1 ? 'template' : 'templates'} available
                </Text>
              </Box>
              <Button
                kind="primary"
                onClick={handleCreateTemplate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Create Template
              </Button>
            </Flex>
          </Box>

          <div className="template-grid">
            {templates.map((template) => (
              <div key={template.id} className="template-card">
                <div className="card-header">
                  <Heading style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{template.name}</Heading>
                  <Button
                    kind="tertiary"
                    size="small"
                    onClick={() => handleDeleteTemplate(template.id)}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    ⋮
                  </Button>
                </div>
                <Text style={{ color: '#6E7278', fontSize: 13 }}>{template.subject}</Text>
                <div className="card-preview">
                  <Text style={{ fontSize: 13 }}>
                    {template.body?.substring(0, 100)}...
                  </Text>
                </div>
                <div className="card-footer">
                  <Text style={{ color: '#6E7278', fontSize: 13 }}>
                    {new Date(template.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        id="create-template-modal"
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        classNames={{
          modal: 'custom-template-modal',
          content: 'custom-template-content'
        }}
      >
        <style>{`
          .custom-template-modal {
            width: 85vw !important;
            max-width: 1200px !important;
            height: 85vh !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          .custom-template-modal [data-testid="modal-content"] {
            padding: 0 !important;
            height: 100% !important;
            display: flex;
            flex-direction: column;
          }
          .hidden-vibe-header, .custom-template-modal [data-testid="modal-header"] {
            display: none !important;
          }
        `}</style>
        <ModalHeader title="Hidden" className="hidden-vibe-header" />
        <Box style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          backgroundColor: '#fff',
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <Flex style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <Heading style={{ fontSize: 20, margin: 0, fontWeight: 500, color: '#323338' }}>New template</Heading>
            <Flex style={{ gap: 16, alignItems: 'center' }}>
              <Flex style={{ gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#323338' }}>Create update:</Text>
                <div style={{ width: 36, height: 20, backgroundColor: '#0073ea', borderRadius: 10, position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: 16, height: 16, backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', right: 2, top: 2 }}></div>
                </div>
              </Flex>
              <Tooltip content="Template owner">
                <Avatar
                  size={Avatar.sizes.SMALL}
                  type={Avatar.types.ICON}
                  icon={() => (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  )}
                  backgroundColor={Avatar.colors.DONE_GREEN}
                />
              </Tooltip>
              <Button kind="tertiary" size="small" style={{ padding: '4px', minWidth: 'auto', color: '#6E7278' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M5 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm6.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm5 1.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
              </Button>
              <Button kind="tertiary" size="small" style={{ padding: '4px', minWidth: 'auto', color: '#6E7278' }} onClick={() => setShowCreateModal(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </Button>
            </Flex>
          </Flex>

          {/* Main Content Area */}
          <Flex style={{ flex: 1, overflow: 'hidden', alignItems: 'stretch' }}>

            {/* Left Area (Editor) */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

              {/* From Row */}
              <Flex style={{ padding: '12px 24px', borderBottom: '1px solid #E5E7EB', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 14, color: '#6E7278', width: 50, fontWeight: 500 }}>From</Text>
                <div style={{ position: 'relative' }}>
                  <Flex
                    style={{
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      padding: '6px 12px',
                      backgroundColor: (showAccountDropdown || authStatus.authenticated) ? '#D2E4FF' : 'transparent',
                      borderRadius: 4,
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      if (authStatus.authenticated) {
                        setShowAccountDropdown(!showAccountDropdown)
                      } else {
                        setShowLoginModal(true)
                      }
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#323338" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <Text style={{ fontSize: 14, color: '#323338', fontWeight: 400 }}>
                      {authStatus.authenticated ? authStatus.email || 'Connected' : 'Select sender account'}
                    </Text>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#323338"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        marginLeft: 4,
                        transition: 'transform 0.2s ease',
                        transform: (showAccountDropdown || showLoginModal) ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </Flex>

                  {/* Account Dropdown */}
                  {showAccountDropdown && authStatus.authenticated && (
                    <Box style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 8,
                      width: 320,
                      backgroundColor: '#fff',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      padding: '16px 0',
                      border: '1px solid #E5E7EB'
                    }}>
                      <Box style={{ padding: '0 16px 12px' }}>
                        <Text style={{ fontSize: 13, fontWeight: 600, color: '#676879', marginBottom: 12, display: 'block' }}>
                          {authStatus.provider === 'gmail' ? 'Gmail' : 'Microsoft'}
                        </Text>
                        <Flex style={{ alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            backgroundColor: '#D04218',
                            borderRadius: '50%',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 600
                          }}>
                            {authStatus.email ? authStatus.email[0].toUpperCase() : 'U'}
                          </div>
                          <Text style={{ fontSize: 14, color: '#323338', flex: 1 }}>
                            {authStatus.email}
                          </Text>
                          <div
                            style={{ cursor: 'pointer', color: '#676879' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAccount();
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </div>
                        </Flex>
                      </Box>

                      <div style={{ height: 1, backgroundColor: '#E5E7EB', margin: '8px 0' }} />

                      <Box
                        style={{
                          padding: '8px 16px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                        onClick={() => {
                          setShowAccountDropdown(false);
                          setShowLoginModal(true);
                        }}
                      >
                        <Text style={{ fontSize: 14, color: '#323338' }}>Add email account</Text>
                      </Box>
                    </Box>
                  )}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, color: '#6E7278', cursor: 'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                </div>
              </Flex>

              {/* Subject Row */}
              <Flex style={{ padding: '12px 24px', borderBottom: '1px solid #E5E7EB', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 14, color: '#6E7278', width: 50, fontWeight: 500 }}>Subject</Text>
                <input
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#323338', padding: '4px 0', backgroundColor: 'transparent' }}
                  placeholder=""
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
                <div style={{ color: '#6E7278', cursor: 'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                </div>
              </Flex>

              {/* Toolbar */}
              <Flex style={{ padding: '8px 24px', borderBottom: '1px solid #E5E7EB', alignItems: 'center', gap: 16, overflowX: 'auto', flexWrap: 'nowrap', backgroundColor: '#fff' }}>
                <Flex style={{ gap: 12, alignItems: 'center', color: '#6E7278', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path></svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"></path></svg>
                </Flex>
                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />
                <Flex style={{ gap: 12, alignItems: 'center', color: '#323338', fontSize: 13, cursor: 'pointer' }}>
                  <span>Arial</span>
                  <span>12px</span>
                </Flex>
                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />
                <Flex style={{ gap: 12, alignItems: 'center', color: '#323338', cursor: 'pointer' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>A</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </Flex>
                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />
                <Flex style={{ gap: 12, alignItems: 'center', color: '#6E7278', cursor: 'pointer' }}>
                  <span style={{ fontWeight: 700, color: '#323338' }}>B</span>
                  <span style={{ fontStyle: 'italic', color: '#323338' }}>I</span>
                  <span style={{ textDecoration: 'underline', color: '#6E7278' }}>U</span>
                  <span style={{ textDecoration: 'line-through', color: '#6E7278' }}>S</span>
                </Flex>
                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />
                <Flex style={{ gap: 12, alignItems: 'center', color: '#6E7278', cursor: 'pointer' }}>
                  <div style={{ padding: '4px 6px', backgroundColor: '#cce5ff', borderRadius: 4, color: '#0073ea', display: 'flex', alignItems: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>
                  <div style={{ padding: '4px 6px', backgroundColor: '#cce5ff', borderRadius: 4, color: '#0073ea', display: 'flex', alignItems: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>
                  </div>
                </Flex>
                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />
                <Text style={{ fontSize: 13, color: '#6E7278', cursor: 'pointer' }}>Text</Text>
                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />
                <Flex style={{ gap: 12, alignItems: 'center', color: '#6E7278', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="4" y2="6"></line><line x1="3" y1="12" x2="4" y2="12"></line><line x1="3" y1="18" x2="4" y2="18"></line></svg>
                </Flex>
                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />
                <Flex style={{ gap: 12, alignItems: 'center', color: '#6E7278', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l-5.41 5.41a2 2 0 1 0 2.83 2.83l5.41-5.41z"></path></svg>
                </Flex>
              </Flex>

              {/* Body Textarea */}
              <Box style={{ flex: 1, display: 'flex', position: 'relative' }}>
                <Text style={{ position: 'absolute', top: 16, left: 24, color: '#6E7278', fontSize: 14, pointerEvents: 'none', display: formData.body ? 'none' : 'block' }}>Body</Text>
                <textarea
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '16px 24px',
                    fontSize: 14,
                    resize: 'none',
                    fontFamily: 'inherit',
                    color: '#323338',
                    backgroundColor: 'transparent'
                  }}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                />
              </Box>
            </Box>

            {/* Right Sidebar */}
            <Box style={{ width: 320, borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>

              <Box style={{ padding: '24px 16px 16px', borderBottom: '1px solid #E5E7EB' }}>
                <Flex style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, cursor: 'pointer' }}>
                  <Flex style={{ alignItems: 'center', gap: 8 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <Heading style={{ fontSize: 16, margin: 0, fontWeight: 500, color: '#323338' }}>Auto-populated fields</Heading>
                  </Flex>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </Flex>

                <Flex style={{ borderBottom: '1px solid #E5E7EB', marginBottom: 16 }}>
                  <div style={{ paddingBottom: 8, borderBottom: '2px solid #0073ea', color: '#0073ea', fontSize: 14, fontWeight: 500, marginRight: 20, cursor: 'pointer' }}>From board</div>
                  <div style={{ paddingBottom: 8, color: '#6E7278', fontSize: 14, cursor: 'pointer' }}>From subitems</div>
                </Flex>

                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <input
                    style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 13, boxSizing: 'border-box', outline: 'none', color: '#323338' }}
                    placeholder="Search"
                  />
                  <svg style={{ position: 'absolute', left: 10, top: 10, color: '#9CA3AF' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>

                <Flex style={{ flexWrap: 'wrap', gap: 8 }}>
                  {['User Name', 'Board Name', 'Group Name', 'Item Name', 'Person', 'Name', 'Status', 'Date', 'Email', 'Text email', 'Contacts', 'Mirror-email', 'Mirror person', 'Mirror - text', 'Item ID'].map((chip) => {
                    const varMap = {
                      'User Name': 'user_name',
                      'Board Name': 'board_name',
                      'Group Name': 'group_name',
                      'Item Name': 'item_name',
                      'Person': 'assignee_name',
                      'Name': 'name',
                      'Status': 'status',
                      'Date': 'due_date',
                      'Email': 'email',
                      'Text email': 'text_email',
                      'Contacts': 'contacts',
                      'Mirror-email': 'mirror_email',
                      'Mirror person': 'mirror_person',
                      'Mirror - text': 'mirror_text',
                      'Item ID': 'item_id'
                    };
                    const varName = varMap[chip];
                    return (
                      <div
                        key={chip}
                        onClick={() => {
                          setFormData({ ...formData, body: formData.body + `{{${varName}}}` })
                        }}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #E5E7EB',
                          borderRadius: 4,
                          fontSize: 13,
                          color: '#6E7278',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: '#fff',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = '#0073ea';
                          e.currentTarget.style.color = '#0073ea';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB';
                          e.currentTarget.style.color = '#6E7278';
                        }}
                      >
                        {chip}
                        {chip === 'Date' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}><polyline points="6 9 12 15 18 9"></polyline></svg>}
                      </div>
                    )
                  })}
                </Flex>
              </Box>

              <Box style={{ padding: '24px 16px' }}>
                <Flex style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, cursor: 'pointer' }}>
                  <Heading style={{ fontSize: 14, margin: 0, fontWeight: 500, color: '#323338' }}>File columns as attachments</Heading>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </Flex>
                <div
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: 4,
                    fontSize: 13,
                    color: '#6E7278',
                    cursor: 'pointer',
                    display: 'inline-block',
                    backgroundColor: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#0073ea';
                    e.currentTarget.style.color = '#0073ea';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.color = '#6E7278';
                  }}
                >
                  Proposals
                </div>
              </Box>
            </Box>
          </Flex>

          {/* Footer */}
          <Flex style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', justifyContent: 'flex-end', backgroundColor: '#fff', alignItems: 'center' }}>
            <Button kind="primary" onClick={handleSaveTemplate} style={{ minWidth: 80, padding: '8px 24px', fontSize: 14 }}>
              Done
            </Button>
          </Flex>
        </Box>
      </Modal>

      <LoginModal
        show={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        boardId={boardId}
        sessionToken={sessionToken}
        onSuccess={() => {
          setShowLoginModal(false)
          fetchAuthStatus()
        }}
      />
    </div>
  )
}
