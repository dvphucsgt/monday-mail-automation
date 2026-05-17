import React from 'react'
import { Box } from '@vibe/layout'
import { Text, Heading } from '@vibe/typography'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function TrendChart({ data, days }) {
  const formattedData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sent: item.sent,
    failed: item.failed
  }))

  if (!data || data.length === 0) {
    return (
      <Box style={{
        padding: 24,
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <Heading style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Email Sending Trend ({days} days)
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
        Xu hướng gửi email ({days} ngày gần nhất)
      </Heading>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="date"
              style={{ fontSize: 12, fill: '#676879' }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              style={{ fontSize: 12, fill: '#676879' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="sent"
              stroke="#00c875"
              strokeWidth={2}
              dot={{ fill: '#00c875', strokeWidth: 2, r: 4 }}
              name="Sent"
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="#df2f4a"
              strokeWidth={2}
              dot={{ fill: '#df2f4a', strokeWidth: 2, r: 4 }}
              name="Failed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Box>
  )
}

export default TrendChart