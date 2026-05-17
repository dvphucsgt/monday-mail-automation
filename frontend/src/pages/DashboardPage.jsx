import React, { useState, useEffect, useContext } from 'react'
import { Heading, Text } from '@vibe/typography'
import { Flex, Box } from '@vibe/layout'
import AppContext from '../utils/AppContext'
import mondaySdk from 'monday-sdk-js'
import { getOverviewStats, getTrendStats, getTemplateStats, getRecipientStats } from '../api/backend'
import StatsCards from '../components/Dashboard/StatsCards'
import TrendChart from '../components/Dashboard/TrendChart'
import TopTemplates from '../components/Dashboard/TopTemplates'
import TopRecipients from '../components/Dashboard/TopRecipients'
import { toast } from 'react-toastify'

function DashboardPage({ context, sessionToken }) {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [trend, setTrend] = useState([])
  const [templates, setTemplates] = useState([])
  const [recipients, setRecipients] = useState([])
  const [trendDays, setTrendDays] = useState(7)
  const [error, setError] = useState(null)
  const monday = mondaySdk()

  useEffect(() => {
    if (sessionToken) {
      loadDashboardData()
    }
  }, [sessionToken, trendDays])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const contextData = await monday.get('context')
      const boardId = contextData.data.boardId

      const [overviewRes, trendRes, templatesRes, recipientsRes] = await Promise.all([
        getOverviewStats(boardId, sessionToken, 7),
        getTrendStats(boardId, sessionToken, trendDays),
        getTemplateStats(boardId, sessionToken),
        getRecipientStats(boardId, sessionToken, 10)
      ])

      setOverview(overviewRes)
      setTrend(trendRes)
      setTemplates(templatesRes)
      setRecipients(recipientsRes)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="loading-spinner" style={{ width: 48, height: 48, border: '4px solid #e0e0e0', borderTopColor: '#0073ea', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <Text style={{ marginTop: 16, color: '#676879' }}>Loading dashboard...</Text>
      </Box>
    )
  }

  // Error state is now handled gracefully by rendering empty components

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Heading style={{ fontSize: 24, fontWeight: 700 }}>
          Dashboard & Analytics
        </Heading>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Text style={{ color: '#676879', fontSize: 14 }}>Time Range:</Text>
          <select
            value={trendDays}
            onChange={(e) => setTrendDays(Number(e.target.value))}
            style={{
              padding: '8px 16px',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              fontSize: 14,
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      <StatsCards overview={overview} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <TrendChart data={trend} days={trendDays} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <TopTemplates templates={templates} />
        </div>
      </div>

      <TopRecipients recipients={recipients} />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default DashboardPage