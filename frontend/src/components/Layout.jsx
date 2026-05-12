import React from 'react'
import { Heading, Text } from '@vibe/typography'
import { Flex, Box } from '@vibe/layout'
import { Link, useLocation } from 'react-router-dom'

const Layout = ({ children, context }) => {
  const location = useLocation()

  return (
    <Box style={{ padding: '40px', backgroundColor: '#f5f6f8', minHeight: '100vh' }}>
      {/* Header / Navbar */}
      <Box style={{ marginBottom: '32px', backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Flex style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Flex style={{ gap: 16, alignItems: 'center' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              backgroundColor: '#0073ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 8px rgba(0,115,234,0.3)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="white" />
              </svg>
            </div>
            <Heading style={{
              fontSize: '28px',
              fontWeight: 800,
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.02em',
              color: '#1a1b23'
            }}>
              AutomatedMail
            </Heading>
          </Flex>
          <Flex style={{ gap: 8 }}>
            {[
              { name: 'Templates', path: '/templates' },
              { name: 'Integrations', path: '/integrations' },
              { name: 'Sent Emails', path: '/logs' },
              { name: 'Settings', path: '/settings' }
            ].map((tab) => {
              const isActive = location.pathname === tab.path
              return (
                <Link
                  key={tab.name}
                  to={`${tab.path}${window.location.search}`}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isActive ? '#0073ea' : '#676879',
                    backgroundColor: isActive ? '#f0f7ff' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'Inter, sans-serif',
                    textDecoration: 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.color = '#1a1b23';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#676879';
                    }
                  }}
                >
                  {tab.name}
                </Link>
              )
            })}
          </Flex>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box style={{ maxWidth: 1400, margin: '0 auto' }}>
        {children}
      </Box>
    </Box>
  )
}

export default Layout
