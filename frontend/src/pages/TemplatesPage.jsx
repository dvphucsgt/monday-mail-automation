import React from 'react'
import { Heading, Text } from '@vibe/typography'
import { Flex, Box } from '@vibe/layout'
import { Link } from '@vibe/core'
import TemplateList from '../components/TemplateList.jsx'

export default function TemplatesPage({ context }) {
  const { boardId } = context || {}

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
        height: 64,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <Flex style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: '100%',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Flex style={{ gap: 12, alignItems: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#0073EA" />
              <path d="M8 10H24M8 16H20M8 22H16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <Heading style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Supermail</Heading>
          </Flex>
          <Flex style={{ gap: 4 }}>
            <Link
              href="#"
              text="Templates"
              style={navItemActiveStyle}
              className="nav-link"
            />
            <Link
              href="#"
              text="Integrations"
              style={navItemStyle}
              className="nav-link"
            />
            <Link
              href="#"
              text="Sent Emails"
              style={navItemStyle}
              className="nav-link"
            />
            <Link
              href="#"
              text="Settings"
              style={navItemStyle}
              className="nav-link"
            />
          </Flex>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box style={{ backgroundColor: '#ffffff', minHeight: 'calc(100vh - 64px)' }}>
        <Flex style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 24px',
          flexDirection: 'column',
          gap: 24
        }}>
          <TemplateList boardId={boardId} />
        </Flex>
      </Box>
    </>
  )
}
