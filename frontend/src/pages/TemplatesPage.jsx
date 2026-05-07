import React from 'react'
import { Heading, Text } from '@vibe/typography'
import { Flex, Box } from '@vibe/layout'
import { Link } from '@vibe/core'
import TemplateList from '../components/TemplateList.jsx'

export default function TemplatesPage({ context, sessionToken }) {
  // Use a fallback boardId for local development when testing outside Monday.com
  const boardId = context?.boardId || 'local-test-board'

  const navItemStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6E7278',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }

  const navItemActiveStyle = {
    ...navItemStyle,
    backgroundColor: '#E8F4FD',
    color: '#0073EA'
  }

  const navItemHoverStyle = {
    backgroundColor: '#F5F6F7',
    color: '#1a1a1a'
  }

  const buttonStyle = {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'inherit',
    backgroundColor: '#0073ea',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  }

  return (
    <>
      {/* Navbar */}
      <Box style={{
        height: 72,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <Flex style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 32px',
          height: '100%',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Flex style={{ gap: 14, alignItems: 'center' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#0073ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 115, 234, 0.2)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <Heading style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              margin: 0, 
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.02em',
              color: '#1a1b23'
            }}>
              Supermail
            </Heading>
          </Flex>
          <Flex style={{ gap: 8 }}>
            {['Templates', 'Integrations', 'Sent Emails', 'Settings'].map((tab) => (
              <div
                key={tab}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: tab === 'Templates' ? '#0073ea' : '#676879',
                  backgroundColor: tab === 'Templates' ? '#f0f7ff' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'Inter, sans-serif'
                }}
                onMouseOver={(e) => {
                  if (tab !== 'Templates') {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.color = '#1a1b23';
                  }
                }}
                onMouseOut={(e) => {
                  if (tab !== 'Templates') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#676879';
                  }
                }}
              >
                {tab}
              </div>
            ))}
          </Flex>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box style={{ backgroundColor: '#F8F9FB', minHeight: 'calc(100vh - 72px)' }}>
        <Flex style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '40px 32px',
          flexDirection: 'column',
        }}>
          <TemplateList boardId={boardId} sessionToken={sessionToken} />
        </Flex>
      </Box>
    </>
  )
}
