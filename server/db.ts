import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load .env from several possible locations
const envPaths = [
  path.join(process.cwd(), '.env'),          // Current working directory
  path.join(__dirname, '.env'),               // Same directory as the script
  path.join(__dirname, '..', '.env'),        // Parent directory (useful for dist/)
  path.join(__dirname, '..', '..', '.env'),  // Two levels up (useful for deeper routes)
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

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
