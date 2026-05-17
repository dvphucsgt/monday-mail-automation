import React from 'react'
import { Box } from '@vibe/layout'
import { Text, Heading } from '@vibe/typography'
import { Flex } from '@vibe/layout'

function TopRecipients({ recipients }) {
  if (!recipients || recipients.length === 0) {
    return (
      <Box style={{
        padding: 24,
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <Heading style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Top Recipients
        </Heading>
        <Text style={{ color: '#676879' }}>No data available</Text>
      </Box>
    )
  }

  return (
    <Box style={{
      padding: 24,
      backgroundColor: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <Heading style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Top Người Nhận
      </Heading>
      <Flex direction="column" gap={12}>
        {recipients.map((recipient, index) => (
          <Box
            key={recipient.email}
            style={{
              padding: 16,
              backgroundColor: '#f8f9fa',
              borderRadius: 12,
              border: '1px solid #e0e0e0'
            }}
          >
            <Flex justifyContent="space-between" alignItems="center">
              <Flex direction="column" gap={4}>
                <Flex alignItems="center" gap={8}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#1a1b23'
                  }}>
                    #{index + 1}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1a1b23'
                  }}>
                    {recipient.email}
                  </Text>
                </Flex>
                <Text style={{
                  fontSize: 12,
                  color: '#676879'
                }}>
                  Last sent: {new Date(recipient.last_sent).toLocaleString('en-US')}
                </Text>
              </Flex>
              <Box style={{
                padding: '8px 16px',
                backgroundColor: '#0073ea15',
                borderRadius: 20
              }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0073ea'
                }}>
                  {recipient.count} emails
                </Text>
              </Box>
            </Flex>
          </Box>
        ))}
      </Flex>
    </Box>
  )
}

export default TopRecipients