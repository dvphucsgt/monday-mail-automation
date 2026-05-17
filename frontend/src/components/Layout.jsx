import React from 'react'
import { Heading, Text } from '@vibe/typography'
import { Flex, Box } from '@vibe/layout'
import { Link, useLocation } from 'react-router-dom'

const Layout = ({ children, context }) => {
  const location = useLocation()

  return (
    <div className="layout-wrapper" style={{ padding: 'clamp(20px, 5vw, 60px)', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header / Navbar */}
      <div className="layout-header-box" style={{
        marginBottom: 'clamp(24px, 4vw, 48px)',
        backgroundColor: '#ffffff',
        padding: 'clamp(20px, 4vw, 32px)',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid rgba(0, 0, 0, 0.04)'
      }}>
        <div className="layout-header-flex" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 1400,
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0073ea 0%, #0056b3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(0, 115, 234, 0.25)',
              transition: 'transform 0.2s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="white" />
              </svg>
              {/* Add a subtle gradient overlay for depth */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
                borderRadius: '16px'
              }} />
            </div>
            <div>
              <Heading style={{
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: 800,
                fontFamily: 'Outfit, sans-serif',
                letterSpacing: '-0.02em',
                color: '#1a1b23',
                margin: 0
              }}>
                AutomatedMail
              </Heading>
              <Text style={{
                fontSize: '14px',
                color: '#676879',
                fontFamily: 'Inter, sans-serif',
                margin: 0,
                marginTop: 4
              }}>
                Professional Email Automation
              </Text>
            </div>
          </div>

          <style>{`.layout-nav-flex::-webkit-scrollbar { display: none; }`}</style>
          <div className="layout-nav-flex" style={{
            display: 'flex',
            overflowX: 'auto',
            gap: 12,
            paddingBottom: 6,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            maxWidth: '600px'
          }}>
            {[
              { name: 'Dashboard', path: '/dashboard' },
              { name: 'Templates', path: '/templates' },
              { name: 'Integrations', path: '/integrations' }
            ].map((tab) => {
              const isActive = location.pathname === tab.path
              return (
                <Link
                  key={tab.name}
                  to={`${tab.path}${window.location.search}`}
                  style={{
                    padding: 'clamp(10px, 1.5vw, 14px) clamp(20px, 2vw, 28px)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isActive ? '#0073ea' : '#676879',
                    backgroundColor: isActive ? '#e3f2fd' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'Inter, sans-serif',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                      e.currentTarget.style.color = '#1a1b23';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#676879';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {tab.name}
                  {/* Active state indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, #0073ea 0%, #0056b3 100%)',
                      borderRadius: '0 0 12px 12px'
                    }} />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%'
      }}>
        {children}
      </div>
    </div>
  )
}

export default Layout
