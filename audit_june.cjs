const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rider_scheduling'
  });
  const [rows] = await conn.query("SELECT status, delivery_status FROM delivery_requests WHERE created_at LIKE '2026-06%'");
  console.log('Total June requests:', rows.length);
  
  let pending = 0; let assigned = 0; let action_req = 0;
  for(const r of rows) {
    let s = String(r.status||'').toLowerCase();
    let d = String(r.delivery_status||'pending').toLowerCase();
    if(s === 'returned_for_revision') action_req++;
    else if(s !== 'disapproved' && s !== 'cancelled' && d !== 'completed' && d !== 'failed') {
      if(d === 'assigned') assigned++;
      else pending++;
    }
  }
  console.log({ pending, assigned, action_req });
  conn.end();
}
run();
