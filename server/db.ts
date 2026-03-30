import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root of the server folder.
dotenv.config({ path: path.join(process.cwd(), '.env') });

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'), // Support for Aiven port
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rider_scheduling',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

// Startup check
pool.getConnection()
   .then(conn => {
     console.log(`✅ DB Connected: ${process.env.DB_NAME} on port
${process.env.DB_PORT || '3306'}`);
     conn.release();
})
  .catch(err => {
     console.error('❌ DB Connection Failed:', err.message);
});
