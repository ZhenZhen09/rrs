import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Helper to get timeframe filter
const getDateFilter = (query: any, prefix = '') => {
  if (query.monthYear && /^\d{4}-\d{2}$/.test(query.monthYear)) {
    return `DATE_FORMAT(${prefix}created_at, '%Y-%m') = '${query.monthYear}'`;
  }
  const timeframe = query.timeframe || 'monthly';
  switch (timeframe) {
    case 'real-time':
      return `${prefix}created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`;
    case 'daily':
      return `DATE(${prefix}created_at) = CURDATE()`;
    case 'weekly':
      return `${prefix}created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`;
    default:
      return `${prefix}created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`; // Monthly default
  }
};

const getEventTimeFilter = (query: any) => getDateFilter(query).replace(/created_at/g, 'event_time');

const formatDurationSeconds = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const getConnectivityRecommendation = (likelyReason: string, offlineCount: number) => {
  if (offlineCount >= 5) return 'Supervisor review or temporary dispatch restriction recommended.';
  if (likelyReason === 'Low Battery Risk') return 'Require charging before dispatch or provide a power bank.';
  if (likelyReason === 'Likely Battery Conservation') return 'Remind rider that turning off data hides active task tracking.';
  if (likelyReason === 'Suspicious Offline') return 'Supervisor review recommended.';
  return 'Manual review needed.';
};

const getReliability = (offlineCount: number, totalOfflineSeconds: number) => {
  if (offlineCount >= 5 || totalOfflineSeconds > 30 * 60) return 'Critical';
  if (offlineCount >= 2) return 'Watchlist';
  return 'Reliable';
};

const formatDateLabel = (value: any) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getDateKey = (value: any) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toISOString().slice(0, 10);
};

// 1. Actual vs. Estimated Route Efficiency
router.get('/route-efficiency', async (req, res) => {
  try {
    const tf = req.query.timeframe as string;
    const filter = getDateFilter(req.query);
    
    const [requests] = await pool.query(`
      SELECT request_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng 
      FROM delivery_requests 
      WHERE delivery_status IN ('completed', 'in_transit')
      AND ${filter}
    `) as any[];
    
    // Decimate logs for longer timeframes to prevent memory/performance issues
    let logsQuery = '';
    if (tf === 'real-time' || tf === 'daily') {
      logsQuery = `
        SELECT request_id, lat, lng, timestamp 
        FROM location_logs 
        WHERE ${filter.replace(/created_at/g, 'timestamp')}
        ORDER BY timestamp ASC
      `;
    } else {
      // Decimate coordinates into 5-minute intervals (300 seconds)
      logsQuery = `
        SELECT 
          request_id, 
          AVG(lat) as lat, 
          AVG(lng) as lng, 
          MIN(timestamp) as timestamp 
        FROM location_logs 
        WHERE ${filter.replace(/created_at/g, 'timestamp')}
        GROUP BY request_id, UNIX_TIMESTAMP(timestamp) DIV 300
        ORDER BY timestamp ASC
      `;
    }

    const [logs] = await pool.query(logsQuery) as any[];

    res.json({ requests, logs });
  } catch (error) {
    console.error('Error fetching route efficiency:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Delivery Hotspot Clustering (Heatmaps)
router.get('/hotspots', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [rows] = await pool.query(`
      SELECT ROUND(dropoff_lat, 3) as lat, ROUND(dropoff_lng, 3) as lng, COUNT(*) as weight 
      FROM delivery_requests 
      WHERE dropoff_lat IS NOT NULL AND dropoff_lng IS NOT NULL
      AND ${filter}
      GROUP BY ROUND(dropoff_lat, 3), ROUND(dropoff_lng, 3)
      ORDER BY weight DESC
      LIMIT 50
    `) as any[];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. Peak Hour Analysis
router.get('/peak-hours', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [rows] = await pool.query(`
      SELECT HOUR(created_at) as hour, COUNT(*) as volume
      FROM delivery_requests
      WHERE ${filter}
      GROUP BY HOUR(created_at)
      ORDER BY hour ASC
    `) as any[];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching peak hours:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. Demand Prediction
router.get('/forecast', async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay() + 1;

    const [rows] = await pool.query(`
      SELECT hour_of_day, AVG(volume) as expected_volume
      FROM (
        SELECT 
          HOUR(created_at) as hour_of_day, 
          DATE(created_at) as d,
          COUNT(*) as volume
        FROM delivery_requests
        WHERE DAYOFWEEK(created_at) = ?
        AND created_at > DATE_SUB(NOW(), INTERVAL 60 DAY)
        GROUP BY HOUR(created_at), DATE(created_at)
      ) as hourly_stats
      GROUP BY hour_of_day
      ORDER BY hour_of_day ASC
    `, [dayOfWeek]) as any[];

    res.json({
      day: tomorrow.toLocaleDateString('en-US', { weekday: 'long' }),
      forecast: rows
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 5. Rider Performance
router.get('/rider-performance', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [rows] = await pool.query(`
      SELECT 
        assigned_rider_name as name,
        COUNT(*) as assigned,
        SUM(CASE WHEN delivery_status = 'completed' THEN 1 ELSE 0 END) as completed,
        ROUND((SUM(CASE WHEN delivery_status = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) as success_rate
      FROM delivery_requests 
      WHERE assigned_rider_id IS NOT NULL
      AND ${filter}
      GROUP BY assigned_rider_id, assigned_rider_name
      ORDER BY success_rate DESC
    `) as any[];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching rider performance:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 6. Exceptions & Issues
router.get('/exceptions', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [rows] = await pool.query(`
      SELECT request_id, urgency_level, status, 
      TIMESTAMPDIFF(MINUTE, created_at, NOW()) as wait_time
      FROM delivery_requests 
      WHERE (delivery_status = 'pending' OR delivery_status = 'failed')
      AND (urgency_level = 'Urgent' OR urgency_level = 'High')
      AND ${filter}
      LIMIT 5
    `) as any[];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching exceptions:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 7. Overall Summary Stats
router.get('/summary-stats', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [counts] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN delivery_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN delivery_status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
        SUM(CASE WHEN delivery_status = 'pending' OR delivery_status = 'assigned' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM delivery_requests
      WHERE ${filter}
    `) as any[];
    
    const [avgTime] = await pool.query(`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) / 60 as avg_hours
      FROM delivery_requests
      WHERE delivery_status = 'completed' AND completed_at IS NOT NULL
      AND ${filter}
    `) as any[];

    const onTimeRate = 87.5; 

    const [utilization] = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT assigned_rider_id) FROM delivery_requests WHERE delivery_status IN ('assigned', 'picked_up', 'in_transit') AND ${filter}) / 
        (SELECT COUNT(*) FROM users WHERE role = 'rider') * 100 as rate
    `) as any[];

    res.json({
      counts: counts[0],
      avgTime: avgTime[0].avg_hours || 0,
      onTimeRate,
      utilization: Math.round(utilization[0].rate || 0)
    });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 8. Departmental Allocation
router.get('/department-allocation', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [rows] = await pool.query(`
      SELECT requester_department, urgency_level, COUNT(*) as volume 
      FROM delivery_requests 
      WHERE ${filter}
      GROUP BY requester_department, urgency_level
      ORDER BY requester_department, volume DESC
    `) as any[];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching department allocation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 9. Urgency Inflation
router.get('/urgency-inflation', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [rows] = await pool.query(`
      SELECT 
        urgency_level, 
        COUNT(*) as total_completed,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_completion_minutes 
      FROM delivery_requests 
      WHERE delivery_status = 'completed'
      AND ${filter}
      GROUP BY urgency_level
      ORDER BY avg_completion_minutes ASC
    `) as any[];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching urgency inflation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 10. Location Insights
router.get('/location-insights', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [pickups] = await pool.query(`
      SELECT pickup_address as name, COUNT(*) as count 
      FROM delivery_requests 
      WHERE ${filter}
      GROUP BY pickup_address 
      ORDER BY count DESC 
      LIMIT 3
    `) as any[];
    
    const [dropoffs] = await pool.query(`
      SELECT dropoff_address as name, COUNT(*) as count 
      FROM delivery_requests 
      WHERE ${filter}
      GROUP BY dropoff_address 
      ORDER BY count DESC 
      LIMIT 3
    `) as any[];

    res.json({ pickups, dropoffs });
  } catch (error) {
    console.error('Error fetching location insights:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 11. Operational Integrity (Layer 4)
router.get('/operational-integrity', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    
    // Matrix 1: Tactical Leave Correlation
    // Flags riders who report 'absent' within 60 mins of a schedule view/assignment
    const [tacticalLeaves] = await pool.query(`
      SELECT u.name as rider_name, al.date, al.status, al.reason,
             me.timestamp as view_timestamp, al.created_at as report_timestamp,
             TIMESTAMPDIFF(MINUTE, me.timestamp, al.created_at) as gap_minutes
      FROM users u
      JOIN attendance_logs al ON u.id = al.rider_id
      JOIN movement_events me ON u.id = me.rider_id
      WHERE al.status IN ('absent', 'on_leave')
      AND me.event_type = 'assignment'
      AND ABS(TIMESTAMPDIFF(MINUTE, me.timestamp, al.created_at)) < 60
      AND ${filter.replace(/created_at/g, 'al.created_at')}
    `) as any[];

    // Matrix 2: Departmental Bias Matrix
    const [biasMatrix] = await pool.query(`
      SELECT requester_department as department,
             COUNT(*) as total_tasks,
             SUM(CASE WHEN delivery_status = 'completed' THEN 1 ELSE 0 END) as completed,
             ROUND((SUM(CASE WHEN delivery_status = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) as completion_rate,
             AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as avg_handle_time
      FROM delivery_requests
      WHERE delivery_status IS NOT NULL
      AND ${filter}
      GROUP BY requester_department
      ORDER BY completion_rate DESC
    `) as any[];

    // Matrix 3: Sequence Deviation Log
    const [deviationLog] = await pool.query(`
      SELECT u.name as rider_name, me.message as reason, me.timestamp,
             JSON_UNQUOTE(JSON_EXTRACT(me.metadata, '$.requestId')) as request_id,
             JSON_UNQUOTE(JSON_EXTRACT(me.metadata, '$.photoUrl')) as has_photo
      FROM movement_events me
      JOIN users u ON me.rider_id = u.id
      WHERE me.event_type = 'deviation_requested'
      AND ${filter.replace(/created_at/g, 'me.timestamp')}
      ORDER BY me.timestamp DESC
    `) as any[];

    // Matrix 4: Ghost Miles / Route Compliance
    const [ghostMiles] = await pool.query(`
      SELECT u.name as rider_name,
             COUNT(CASE WHEN me.event_type = 'idle_alert' THEN 1 END) as idle_incidents,
             COUNT(CASE WHEN me.event_type = 'deviation_resolved' THEN 1 END) as approved_skips,
             COUNT(DISTINCT me.request_id) as total_tasks
      FROM users u
      LEFT JOIN movement_events me ON u.id = me.rider_id
      WHERE u.role = 'rider'
      AND ${filter.replace(/created_at/g, 'me.timestamp')}
      GROUP BY u.id, u.name
    `) as any[];

    // Calculate Master Integrity Scores
    const [integrityScores] = await pool.query(`
      SELECT u.name, u.id,
             100 - (
               (COUNT(CASE WHEN me.event_type = 'deviation_requested' THEN 1 END) * 10) +
               (COUNT(CASE WHEN me.event_type = 'idle_alert' THEN 1 END) * 5)
             ) as score
      FROM users u
      LEFT JOIN movement_events me ON u.id = me.rider_id
      WHERE u.role = 'rider'
      GROUP BY u.id, u.name
    `) as any[];

    res.json({
      tacticalLeaves,
      biasMatrix,
      deviationLog,
      ghostMiles,
      integrityScores: integrityScores.map((s: any) => ({
        ...s,
        score: Math.max(0, Math.min(100, s.score))
      }))
    });
  } catch (error) {
    console.error('Error fetching integrity analytics:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 12. Rider Connectivity Audit
router.get('/rider-connectivity', async (req, res) => {
  const timeframe = (req.query.timeframe as string) || 'real-time';
  const riderId = req.query.riderId as string | undefined;
  const eventType = req.query.eventType as string | undefined;
  const risk = req.query.risk as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const where: string[] = [];
  const params: any[] = [];
  const timeframeWhere: string[] = [];
  const timeframeParams: any[] = [];

  if (from) {
    where.push('event_time >= ?');
    timeframeWhere.push('event_time >= ?');
    params.push(from);
    timeframeParams.push(from);
  }
  if (to) {
    where.push('event_time <= ?');
    timeframeWhere.push('event_time <= ?');
    params.push(to);
    timeframeParams.push(to);
  }
  if (!from && !to) {
    const timeframeFilter = getEventTimeFilter(timeframe);
    where.push(timeframeFilter);
    timeframeWhere.push(timeframeFilter);
  }
  if (riderId && riderId !== 'all') {
    where.push('rider_id = ?');
    params.push(riderId);
  }
  if (eventType && eventType !== 'all') {
    where.push('event_type = ?');
    params.push(eventType);
  }
  if (risk && risk !== 'all') {
    where.push('risk_level = ?');
    params.push(risk);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const timeframeWhereSql = timeframeWhere.length ? `WHERE ${timeframeWhere.join(' AND ')}` : '';

  try {
    const [riderRows]: any = await pool.query(
      `SELECT rider_id, COALESCE(MAX(rider_name), rider_id) as rider_name
       FROM rider_connectivity_logs
       ${timeframeWhereSql}
       GROUP BY rider_id
       ORDER BY rider_name ASC`,
      timeframeParams,
    );

    const [rows]: any = await pool.query(
      `SELECT id, rider_id, rider_name, request_id, event_type, event_time,
              delivery_status, is_on_duty, lat, lng, location_recorded_at,
              location_age_seconds, battery_level, network_type, duration_seconds,
              likely_reason, risk_level, metadata
       FROM rider_connectivity_logs
       ${whereSql}
       ORDER BY event_time DESC
       LIMIT 500`,
      params,
    );

    const logs = (rows || []).map((row: any) => {
      const offlineCountPlaceholder = 1;
      return {
        ...row,
        duration_label: row.duration_seconds ? formatDurationSeconds(Number(row.duration_seconds)) : null,
        location_url: row.lat && row.lng ? `https://www.google.com/maps?q=${row.lat},${row.lng}` : null,
        recommendation: getConnectivityRecommendation(row.likely_reason || 'Unknown', offlineCountPlaceholder),
      };
    });

    const timelineMap = new Map<string, any>();
    const reasonMap = new Map<string, number>();
    const riskMap = new Map<string, number>();

    for (const log of logs) {
      const dateKey = getDateKey(log.event_time);
      const currentDay = timelineMap.get(dateKey) || {
        date: dateKey,
        label: formatDateLabel(log.event_time),
        offline: 0,
        restored: 0,
        delayed: 0,
      };
      if (log.event_type === 'offline_in_progress') currentDay.offline += 1;
      if (log.event_type === 'online_restored') currentDay.restored += 1;
      if (log.event_type === 'delayed_location') currentDay.delayed += 1;
      timelineMap.set(dateKey, currentDay);

      if (log.event_type === 'offline_in_progress') {
        const reason = log.likely_reason || 'Unknown';
        reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
      }

      const riskKey = log.risk_level || 'unknown';
      riskMap.set(riskKey, (riskMap.get(riskKey) || 0) + 1);
    }

    const offlineLogs = logs.filter((log: any) => log.event_type === 'offline_in_progress');
    const restoredLogs = logs.filter((log: any) => log.event_type === 'online_restored');
    const riderIdsWithRepeatedOffline = new Set<string>();
    const offlineCountsByRider = new Map<string, number>();

    for (const log of offlineLogs) {
      const count = (offlineCountsByRider.get(log.rider_id) || 0) + 1;
      offlineCountsByRider.set(log.rider_id, count);
      if (count >= 2) riderIdsWithRepeatedOffline.add(log.rider_id);
    }

    const totalOfflineSeconds = restoredLogs.reduce(
      (sum: number, log: any) => sum + Number(log.duration_seconds || 0),
      0,
    );

    const byRider = new Map<string, any>();
    for (const log of logs) {
      if (!byRider.has(log.rider_id)) {
        byRider.set(log.rider_id, {
          rider_id: log.rider_id,
          rider_name: log.rider_name || log.rider_id,
          duty_sessions: 0,
          offline_during_tasks: 0,
          total_offline_seconds: 0,
          low_battery_count: 0,
          high_battery_count: 0,
          battery_samples: [] as number[],
        });
      }

      const item = byRider.get(log.rider_id);
      if (log.event_type === 'duty_on') item.duty_sessions += 1;
      if (log.event_type === 'offline_in_progress') {
        item.offline_during_tasks += 1;
        const battery = Number(log.battery_level);
        if (Number.isFinite(battery)) {
          item.battery_samples.push(battery);
          if (battery <= 20) item.low_battery_count += 1;
          if (battery > 40) item.high_battery_count += 1;
        }
      }
      if (log.event_type === 'online_restored') {
        item.total_offline_seconds += Number(log.duration_seconds || 0);
      }
    }

    const riderReport = Array.from(byRider.values()).map((item: any) => {
      const averageOfflineSeconds = item.offline_during_tasks > 0
        ? Math.round(item.total_offline_seconds / item.offline_during_tasks)
        : 0;
      const avgBattery = item.battery_samples.length
        ? Math.round(item.battery_samples.reduce((a: number, b: number) => a + b, 0) / item.battery_samples.length)
        : null;
      const likelyReason = item.low_battery_count > item.high_battery_count
        ? 'Low Battery Risk'
        : item.high_battery_count > 0
          ? 'Suspicious Offline'
          : 'Unknown';

      return {
        ...item,
        average_offline_seconds: averageOfflineSeconds,
        average_offline_label: averageOfflineSeconds ? formatDurationSeconds(averageOfflineSeconds) : '-',
        total_offline_label: formatDurationSeconds(item.total_offline_seconds),
        average_battery_before_offline: avgBattery,
        reliability: getReliability(item.offline_during_tasks, item.total_offline_seconds),
        likely_reason: likelyReason,
        recommendation: getConnectivityRecommendation(likelyReason, item.offline_during_tasks),
      };
    }).sort((a, b) => b.offline_during_tasks - a.offline_during_tasks);

    res.json({
      summary: {
        offlineInProgress: offlineLogs.length,
        totalOfflineSeconds,
        totalOfflineLabel: formatDurationSeconds(totalOfflineSeconds),
        lowBatteryIncidents: offlineLogs.filter((log: any) => Number(log.battery_level) <= 20).length,
        suspiciousIncidents: offlineLogs.filter((log: any) => Number(log.battery_level) > 40).length,
        repeatRiders: riderIdsWithRepeatedOffline.size,
      },
      logs,
      riderReport,
      riderOptions: riderRows || [],
      timeline: Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      reasonBreakdown: Array.from(reasonMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      riskBreakdown: Array.from(riskMap.entries())
        .map(([risk, count]) => ({ risk, count }))
        .sort((a, b) => {
          const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4 };
          return (order[a.risk] ?? 5) - (order[b.risk] ?? 5);
        }),
    });
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return res.json({
        summary: {
          offlineInProgress: 0,
          totalOfflineSeconds: 0,
          totalOfflineLabel: '0m',
          lowBatteryIncidents: 0,
          suspiciousIncidents: 0,
          repeatRiders: 0,
        },
        logs: [],
        riderReport: [],
        riderOptions: [],
        timeline: [],
        reasonBreakdown: [],
        riskBreakdown: [],
        warning: 'rider_connectivity_logs table is missing. Run scripts/migrate-rider-connectivity-logs.cjs against defaultdb_test.',
      });
    }

    console.error('Error fetching rider connectivity analytics:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 13. Monthly Trend
router.get('/monthly-trend', async (req, res) => {
  try {
    const monthYear = req.query.monthYear as string;
    const monthStr = monthYear || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const baseDateStr = `${monthStr}-01`;
    
    const [rows] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month_key,
        DATE_FORMAT(created_at, '%b') as month,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN delivery_status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM delivery_requests
      WHERE created_at >= DATE_SUB(?, INTERVAL 2 MONTH)
      AND created_at < DATE_ADD(?, INTERVAL 1 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY month_key ASC
    `, [baseDateStr, baseDateStr]) as any[];

    res.json(rows);
  } catch (error) {
    console.error('Error fetching monthly trend:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 14. Request Category Breakdown
router.get('/request-categories', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [rows] = await pool.query(`
      SELECT request_type, COUNT(*) as volume 
      FROM delivery_requests 
      WHERE ${filter}
      GROUP BY request_type
      ORDER BY volume DESC
    `) as any[];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching request categories:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 15. Daily Transactions Heatmap
router.get('/daily-heatmap', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count 
      FROM delivery_requests 
      WHERE ${filter}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC
    `) as any[];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching daily heatmap:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 16. Top Reasons for Failure
router.get('/failure-reasons', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [rows] = await pool.query(`
      SELECT rider_remark as reason
      FROM delivery_requests
      WHERE delivery_status = 'failed' AND ${filter}
    `) as any[];
    
    const reasonCounts: Record<string, number> = {};
    rows.forEach((row: any) => {
      let r = row.reason || 'No reason provided';
      r = r.replace(/\[Admin update by.*?\]\s*/, '').trim();
      if (!r) r = 'No reason provided';
      
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });

    const sortedReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json(sortedReasons);
  } catch (error) {
    console.error('Error fetching failure reasons:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 17. Export CSV Data
router.get('/export-csv', async (req, res) => {
  try {
    const filter = getDateFilter(req.query);
    const [rows] = await pool.query(`
      SELECT 
        request_id,
        created_at,
        status,
        requester_name,
        requester_department,
        request_type,
        pickup_address,
        dropoff_address,
        personnel_instructions,
        admin_remark,
        delivery_status,
        rider_remark,
        assigned_rider_name
      FROM delivery_requests
      WHERE ${filter}
      ORDER BY created_at DESC
    `) as any[];

    res.json(rows);
  } catch (error) {
    console.error('Error fetching export data:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
