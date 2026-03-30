const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkUsers() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rider_scheduling'
    });

    console.log('Connected to database:', process.env.DB_NAME);

    const [rows] = await connection.execute('SELECT id, email, role FROM users');
    console.log('Current users in database:');
    console.table(rows);

    if (rows.length === 0) {
      console.log('No users found. Inserting mock data...');
      await connection.execute(`
        INSERT IGNORE INTO users (id, email, name, role, department, password_hash) VALUES
        ('admin_001', 'admin@company.com', 'Sarah Admin', 'admin', NULL, 'password'),
        ('personnel_001', 'john.hr@company.com', 'John Smith', 'personnel', 'Human Resources', 'password'),
        ('personnel_002', 'jane.finance@company.com', 'Jane Doe', 'personnel', 'Finance', 'password'),
        ('rider_001', 'rider1@company.com', 'Mike Rider', 'rider', NULL, 'password'),
        ('rider_002', 'rider2@company.com', 'Anna Transport', 'rider', NULL, 'password')
      `);
      console.log('Mock data inserted.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkUsers();
