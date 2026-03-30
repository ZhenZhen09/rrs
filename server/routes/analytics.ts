import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Helper to get timeframe filter
const getTimeframeFilter = (timeframe: string) => {
  switch (timeframe) {
    case 'real-time':
      return 'created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)';
    case 'daily':
      return 'DATE(created_at) = CURDATE()';
    case 'weekly':
      return 'created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)';
    default:
      return 'created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)'; // Monthly default
  }
};

// 1. Actual vs. Estimated Route Efficiency
router.get('/route-efficiency', async (req, res) => {
  try {
    const filter = getTimeframeFilter(req.query.timeframe as string);
    const [requests] = await pool.query(`
      SELECT request_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng 
      FROM delivery_requests 
      WHERE delivery_status IN ('completed', 'in_transit')
      AND ${filter}
    `);
    
    const [logs] = await pool.query(`
      SELECT request_id, lat, lng, timestamp 
      FROM location_logs 
      WHERE timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY timestamp ASC
    `);

    res.json({ requests, logs });
  } catch (error) {
    console.error('Error fetching route efficiency:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Delivery Hotspot Clustering (Heatmaps)
router.get('/hotspots', async (req, res) => {
  try {
    const filter = getTimeframeFilter(req.query.timeframe as string);
    const [rows] = await pool.query(`
      SELECT ROUND(dropoff_lat, 3) as lat, ROUND(dropoff_lng, 3) as lng, COUNT(*) as weight 
      FROM delivery_requests 
      WHERE dropoff_lat IS NOT NULL AND dropoff_lng IS NOT NULL
      AND ${filter}
      GROUP BY ROUND(dropoff_lat, 3), ROUND(dropoff_lng, 3)
      ORDER BY weight DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. Peak Hour Analysis
router.get('/peak-hours', async (req, res) => {
  try {
    const filter = getTimeframeFilter(req.query.timeframe as string);
    const [rows] = await pool.query(`
      SELECT HOUR(created_at) as hour, COUNT(*) as volume
      FROM delivery_requests
      WHERE ${filter}
      GROUP BY HOUR(created_at)
      ORDER BY hour ASC
    `);
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
    `, [dayOfWeek]);

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
    const filter = getTimeframeFilter(req.query.timeframe as string);
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
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching rider performance:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 6. Exceptions & Issues
router.get('/exceptions', async (req, res) => {
  try {
    const filter = getTimeframeFilter(req.query.timeframe as string);
    const [rows] = await pool.query(`
      SELECT request_id, urgency_level, status, 
      TIMESTAMPDIFF(MINUTE, created_at, NOW()) as wait_time
      FROM delivery_requests 
      WHERE (delivery_status = 'pending' OR delivery_status = 'failed')
      AND (urgency_level = 'Urgent' OR urgency_level = 'High')
      AND ${filter}
      LIMIT 5
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching exceptions:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 7. Overall Summary Stats
router.get('/summary-stats', async (req, res) => {
  try {
    const filter = getTimeframeFilter(req.query.timeframe as string);
    const [counts] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN delivery_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN delivery_status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
        SUM(CASE WHEN delivery_status = 'pending' OR delivery_status = 'assigned' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM delivery_requests
      WHERE ${filter}
    `);
    
    const [avgTime] = await pool.query(`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) / 60 as avg_hours
      FROM delivery_requests
      WHERE delivery_status = 'completed' AND completed_at IS NOT NULL
      AND ${filter}
    `);

    const onTimeRate = 87.5; 

    const [utilization] = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT assigned_rider_id) FROM delivery_requests WHERE delivery_status IN ('assigned', 'picked_up', 'in_transit') AND ${filter}) / 
        (SELECT COUNT(*) FROM users WHERE role = 'rider') * 100 as rate
    `);

    res.json({
      counts: counts[0],
      avgTime: (avgTime as any)[0].avg_hours || 0,
      onTimeRate,
      utilization: Math.round((utilization as any)[0].rate || 0)
    });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 8. Departmental Allocation
router.get('/department-allocation', async (req, res) => {
  try {
    const filter = getTimeframeFilter(req.query.timeframe as string);
    const [rows] = await pool.query(`
      SELECT requester_department, urgency_level, COUNT(*) as volume 
      FROM delivery_requests 
      WHERE ${filter}
      GROUP BY requester_department, urgency_level
      ORDER BY requester_department, volume DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching department allocation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 9. Urgency Inflation
router.get('/urgency-inflation', async (req, res) => {
  try {
    const filter = getTimeframeFilter(req.query.timeframe as string);
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
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching urgency inflation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 10. Location Insights
router.get('/location-insights', async (req, res) => {
  try {
    const filter = getTimeframeFilter(req.query.timeframe as string);
    const [pickups] = await pool.query(`
      SELECT pickup_address as name, COUNT(*) as count 
      FROM delivery_requests 
      WHERE ${filter}
      GROUP BY pickup_address 
      ORDER BY count DESC 
      LIMIT 3
    `);
    
    const [dropoffs] = await pool.query(`
      SELECT dropoff_address as name, COUNT(*) as count 
      FROM delivery_requests 
      WHERE ${filter}
      GROUP BY dropoff_address 
      ORDER BY count DESC 
      LIMIT 3
    `);

    res.json({ pickups, dropoffs });
  } catch (error) {
    console.error('Error fetching location insights:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
