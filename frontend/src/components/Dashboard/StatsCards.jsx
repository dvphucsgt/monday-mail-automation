import React from 'react'
import { Box } from '@vibe/layout'
import { Text } from '@vibe/typography'
import { Flex } from '@vibe/layout'

function StatsCards({ overview }) {
  const stats = [
    {
      label: 'Total Emails',
      value: overview?.total || 0,
      color: '#0073ea',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor"/>
        </svg>
      )
    },
    {
      label: 'Sent',
      value: overview?.sent || 0,
      color: '#00c875',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
        </svg>
      )
    },
    {
      label: 'Failed',
      value: overview?.failed || 0,
      color: '#df2f4a',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM15.5 16L12 12.5L8.5 16L7 14.5L10.5 11L7 7.5L8.5 6L12 9.5L15.5 6L17 7.5L13.5 11L17 14.5L15.5 16Z" fill="currentColor"/>
        </svg>
      )
    },
    {
      label: 'Success Rate',
      value: `${overview?.successRate || 0}%`,
      color: '#0073ea',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z" fill="currentColor"/>
        </svg>
      )
    }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 16
    }}>
      {stats.map((stat, index) => (
        <Box
          key={index}
          style={{
            padding: 24,
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <Flex direction="column" gap={12}>
            <Flex gap={12} alignItems="center">
              <Box style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: `${stat.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color
              }}>
                {stat.icon}
              </Box>
              <Text style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#676879'
              }}>
                {stat.label}
              </Text>
            </Flex>
            <Text style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#1a1b23',
              lineHeight: 1
            }}>
              {stat.value}
            </Text>
          </Flex>
        </Box>
      ))}
    </div>
  )
}

export default StatsCards