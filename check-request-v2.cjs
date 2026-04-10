const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rider_scheduling',
  });
  const [rows] = await connection.execute('SELECT request_id, assigned_rider_id, status, delivery_status FROM delivery_requests WHERE request_id = ?', ['req_1775789068253']);
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

check().catch(console.error);
