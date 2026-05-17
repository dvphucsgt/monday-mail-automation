import React, { useState } from 'react'
import { Box } from '@vibe/layout'
import { Text, Heading } from '@vibe/typography'
import { Flex } from '@vibe/layout'

function TopTemplates({ templates }) {
  if (!templates || templates.length === 0) {
    return (
      <Box style={{
        padding: 24,
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <Heading style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Top Templates
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
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      width: '100%',
      boxSizing: 'border-box',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Heading style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
        Top Templates
      </Heading>
      <Flex direction="column" gap={16} alignItems="stretch" style={{ width: '100%' }}>
        {templates.map((template, index) => {
          return (
            <TemplateCard key={template.template_id} template={template} index={index} />
          )
        })}
      </Flex>
    </Box>
  )
}

function TemplateCard({ template, index }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '1px solid #e0e0e0',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.02)',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        cursor: 'default'
      }}
    >
      <Flex direction="column" gap={12} style={{ width: '100%' }}>
        <Flex justifyContent="space-between" alignItems="center" style={{ width: '100%' }}>
          <Flex gap={12} alignItems="center" style={{ minWidth: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              backgroundColor: index === 0 ? '#ffcb0020' : index === 1 ? '#c4c4c420' : index === 2 ? '#cd7f3220' : '#f0f0f0',
              color: index === 0 ? '#ffaa00' : index === 1 ? '#9e9e9e' : index === 2 ? '#cd7f32' : '#676879',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 13,
              flexShrink: 0
            }}>
              #{index + 1}
            </div>
            <Text style={{ 
              fontSize: 15, 
              fontWeight: 600, 
              color: '#1a1b23', 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              {template.template_name}
            </Text>
          </Flex>
          <div style={{
            padding: '4px 8px',
            borderRadius: 16,
            backgroundColor: template.success_rate >= 90 ? '#00c87515' : template.success_rate >= 70 ? '#ffcb0015' : '#df2f4a15',
            color: template.success_rate >= 90 ? '#00c875' : template.success_rate >= 70 ? '#ffaa00' : '#df2f4a',
            fontSize: 12, fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginLeft: 12
          }}>
            {template.success_rate}%
          </div>
        </Flex>
        
        <div style={{ width: '100%', height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ 
            width: `${template.success_rate}%`, 
            height: '100%', 
            backgroundColor: template.success_rate >= 90 ? '#00c875' : template.success_rate >= 70 ? '#ffcb00' : '#df2f4a',
            borderRadius: 3,
            transition: 'width 1s ease-in-out'
          }} />
        </div>

        <Flex gap={24} style={{ marginTop: 2 }}>
          <Flex gap={6} alignItems="center">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0073ea' }} />
            <Text style={{ fontSize: 13, color: '#676879' }}>Sent: <span style={{ fontWeight: 600, color: '#1a1b23' }}>{template.total_sent}</span></Text>
          </Flex>
          <Flex gap={6} alignItems="center">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#df2f4a' }} />
            <Text style={{ fontSize: 13, color: '#676879' }}>Failed: <span style={{ fontWeight: 600, color: '#1a1b23' }}>{template.total_failed}</span></Text>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  )
}

export default TopTemplates