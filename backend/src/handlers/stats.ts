import { jsonResponse, errorResponse } from '../utils/response';
import type { Env } from '../utils/types';

interface StatsOverview {
  total: number;
  sent: number;
  failed: number;
  processing: number;
  successRate: number;
  period: {
    from: string;
    to: string;
  };
}

interface TrendData {
  date: string;
  sent: number;
  failed: number;
}

interface TemplateStats {
  template_id: number;
  template_name: string;
  total_sent: number;
  total_failed: number;
  success_rate: number;
}

interface RecipientStats {
  email: string;
  count: number;
  last_sent: string;
}

async function getOverviewStats(env: Env, boardId: string, days: number = 7): Promise<StatsOverview> {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);

  const { results } = await env.DB.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing
    FROM email_logs
    WHERE board_id = ? AND sent_at >= ?
  `).bind(boardId, daysAgo.toISOString()).all();

  const stats: any = results[0] || {};
  const total = (stats.total as number) || 0;
  const sent = (stats.sent as number) || 0;
  const failed = (stats.failed as number) || 0;
  const processing = (stats.processing as number) || 0;
  const successRate = total > 0 ? Math.round((sent / total) * 1000) / 10 : 0;

  return {
    total,
    sent,
    failed,
    processing,
    successRate,
    period: {
      from: daysAgo.toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    }
  };
}

async function getTrendStats(env: Env, boardId: string, days: number): Promise<TrendData[]> {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);

  const { results } = await env.DB.prepare(`
    SELECT
      DATE(sent_at) as date,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM email_logs
    WHERE board_id = ? AND sent_at >= ?
    GROUP BY DATE(sent_at)
    ORDER BY date ASC
  `).bind(boardId, daysAgo.toISOString()).all();

  return results.map((row: any) => ({
    date: row.date as string,
    sent: (row.sent as number) || 0,
    failed: (row.failed as number) || 0
  }));
}

async function getTemplateStats(env: Env, boardId: string): Promise<TemplateStats[]> {
  const { results } = await env.DB.prepare(`
    SELECT
      t.id,
      t.name,
      SUM(CASE WHEN el.status = 'sent' THEN 1 ELSE 0 END) as total_sent,
      SUM(CASE WHEN el.status = 'failed' THEN 1 ELSE 0 END) as total_failed,
      COUNT(*) as total_emails
    FROM templates t
    LEFT JOIN email_logs el ON t.id = el.template_id AND t.board_id = el.board_id
    WHERE t.board_id = ?
    GROUP BY t.id, t.name
    ORDER BY total_sent DESC
    LIMIT 10
  `).bind(boardId).all();

  return results.map((row: any) => {
    const totalEmails = (row.total_emails as number) || 0;
    return {
      template_id: row.id as number,
      template_name: row.name as string,
      total_sent: (row.total_sent as number) || 0,
      total_failed: (row.total_failed as number) || 0,
      success_rate: totalEmails > 0 ? Math.round((row.total_sent as number / totalEmails) * 1000) / 10 : 0
    };
  });
}

async function getRecipientStats(env: Env, boardId: string, limit: number = 10): Promise<RecipientStats[]> {
  const { results } = await env.DB.prepare(`
    SELECT
      recipient,
      COUNT(*) as count,
      MAX(sent_at) as last_sent
    FROM email_logs
    WHERE board_id = ?
    GROUP BY recipient
    ORDER BY count DESC, last_sent DESC
    LIMIT ?
  `).bind(boardId, limit).all();

  return results.map((row: any) => ({
    email: row.recipient as string,
    count: row.count as number,
    last_sent: row.last_sent as string
  }));
}

export async function handleStats(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  const method = request.method;
  console.log(`[Stats] Handling ${method} ${path}`);

  // All stats endpoints require board_id parameter
  const boardId = url.searchParams.get("board_id");
  if (!boardId) {
    return errorResponse(new Error("board_id is required"), 400);
  }

  // GET /stats/overview
  if (path === "/stats/overview" && method === "GET") {
    const days = parseInt(url.searchParams.get("days") || "7");
    const stats = await getOverviewStats(env, boardId, days);
    return jsonResponse(stats);
  }

  // GET /stats/trend
  if (path === "/stats/trend" && method === "GET") {
    const days = parseInt(url.searchParams.get("days") || "7");
    const stats = await getTrendStats(env, boardId, days);
    return jsonResponse(stats);
  }

  // GET /stats/templates
  if (path === "/stats/templates" && method === "GET") {
    const stats = await getTemplateStats(env, boardId);
    return jsonResponse(stats);
  }

  // GET /stats/recipients
  if (path === "/stats/recipients" && method === "GET") {
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const stats = await getRecipientStats(env, boardId, limit);
    return jsonResponse(stats);
  }

  return errorResponse(new Error("Not found"), 404);
}