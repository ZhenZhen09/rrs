const mysql = require('mysql2/promise');

const localConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'defaultdb_test',
};

const aivenConfig = {
  host: 'mysql-3a8b2f89-palomadodlsp-de42.f.aivencloud.com',
  port: 19710,
  user: 'avnadmin',
  password: 'AVNS_mrffoRBrUuBproOe2kV',
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  }
};

function normalizeType(type) {
  if (!type) return type;
  // Remove display widths: int(11) -> int, tinyint(4) -> tinyint
  return type.toLowerCase().replace(/\(\d+\)/g, '');
}

function normalizeDefault(def) {
  if (def === null || def === undefined) return null;
  const d = def.toString().toLowerCase();
  if (d === 'current_timestamp' || d === 'current_timestamp()') return 'CURRENT_TIMESTAMP';
  return d;
}

async function getTables(config) {
  const pool = mysql.createPool(config);
  try {
    const [rows] = await pool.query('SHOW TABLES');
    const tableNames = rows.map(r => Object.values(r)[0]);
    const schemas = {};
    for (const table of tableNames) {
      const [cols] = await pool.query(`DESCRIBE ${table}`);
      schemas[table] = cols;
    }
    return schemas;
  } catch (err) {
    console.error(`Error connecting to ${config.host}:`, err.message);
    return null;
  } finally {
    await pool.end();
  }
}

async function run() {
  console.log('--- Inspecting LOCAL ---');
  const localSchema = await getTables(localConfig);
  
  console.log('\n--- Inspecting AIVEN ---');
  const aivenSchema = await getTables(aivenConfig);

  if (!localSchema || !aivenSchema) {
    console.error('Failed to fetch one or both schemas.');
    return;
  }

  const localTables = Object.keys(localSchema);
  const aivenTables = Object.keys(aivenSchema);

  console.log('\n--- Table Presence ---');
  const missingInAiven = localTables.filter(t => !aivenTables.includes(t));
  const missingInLocal = aivenTables.filter(t => !localTables.includes(t));
  if (missingInAiven.length) console.log(`Missing in Aiven: ${missingInAiven.join(', ')}`);
  if (missingInLocal.length) console.log(`Extra in Aiven: ${missingInLocal.join(', ')}`);
  if (!missingInAiven.length && !missingInLocal.length) console.log('All tables match.');

  console.log('\n--- Significant Column Differences ---');
  let diffCount = 0;
  for (const table of localTables) {
    if (aivenSchema[table]) {
      const localCols = localSchema[table];
      const aivenCols = aivenSchema[table];
      
      const localColNames = localCols.map(c => c.Field);
      const aivenColNames = aivenCols.map(c => c.Field);

      const colMissingInAiven = localColNames.filter(c => !aivenColNames.includes(c));
      const colExtraInAiven = aivenColNames.filter(c => !localColNames.includes(c));

      if (colMissingInAiven.length) {
        console.log(`Table ${table} MISSING columns in Aiven: ${colMissingInAiven.join(', ')}`);
        diffCount++;
      }
      if (colExtraInAiven.length) {
        console.log(`Table ${table} EXTRA columns in Aiven: ${colExtraInAiven.join(', ')}`);
        diffCount++;
      }

      for (const col of localCols) {
        const aivenCol = aivenCols.find(c => c.Field === col.Field);
        if (aivenCol) {
          const diffs = [];
          
          const normLocalType = normalizeType(col.Type);
          const normAivenType = normalizeType(aivenCol.Type);
          
          // Ignore JSON vs LONGTEXT as it's environment specific usually
          if (normLocalType !== normAivenType) {
            if (!(normLocalType === 'longtext' && normAivenType === 'json')) {
                diffs.push(`Type: Aiven=${normAivenType}, Local=${normLocalType}`);
            }
          }

          if (col.Null !== aivenCol.Null) {
            diffs.push(`Null: Aiven=${aivenCol.Null}, Local=${col.Null}`);
          }

          if (col.Key !== aivenCol.Key) {
            // Only report if Local has key that Aiven lacks, or if it's a PRI mismatch
            if (col.Key === 'PRI' || aivenCol.Key === 'PRI') {
                diffs.push(`Key: Aiven=${aivenCol.Key}, Local=${col.Key}`);
            }
          }

          const normLocalDef = normalizeDefault(col.Default);
          const normAivenDef = normalizeDefault(aivenCol.Default);
          if (normLocalDef !== normAivenDef) {
            diffs.push(`Default: Aiven=${normAivenDef}, Local=${normLocalDef}`);
          }
          
          if (diffs.length) {
            console.log(`Table ${table}, Col ${col.Field} differences: ${diffs.join(', ')}`);
            diffCount++;
          }
        }
      }
    }
  }
  if (diffCount === 0) console.log('No significant differences found.');
}

run();
