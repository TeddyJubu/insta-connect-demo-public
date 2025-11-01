#!/usr/bin/env node
/**
 * Database migration script
 * Runs the schema.sql file to create/update database tables
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function runMigration() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('🔄 Running database migration...');

  try {
    await pool.query(schema);
    console.log('✅ Database migration completed successfully!');
    console.log('📊 Tables created/updated:');
    console.log('   - users');
    console.log('   - meta_accounts');
    console.log('   - pages');
    console.log('   - instagram_accounts');
    console.log('   - webhook_subscriptions');
    console.log('   - webhook_events');
    console.log('   - token_refresh_log');
    console.log('   - sessions');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigration };
