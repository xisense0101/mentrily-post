#!/usr/bin/env node
/**
 * Backend Playwright harness for assessment attempt E2E
 * Boots platform-api with test database and runs frontend Playwright harness
 * Validates cross-stack attempt flow: create > answer > submit
 */

import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import postgres from 'postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sleep = promisify(setTimeout);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const API_PORT = process.env.API_PORT || 3001;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'mentrily_test';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

const TEST_DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

console.log('🚀 Assessment Attempt E2E Backend Harness');
console.log('==========================================\n');

// Step 1: Verify test database exists
async function ensureTestDatabase() {
  console.log('📋 Checking test database...');
  try {
    const adminUrl = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/postgres`;
    const sql = postgres(adminUrl, { ssl: false });

    // Check if test database exists
    const databases = await sql`SELECT datname FROM pg_database WHERE datname = ${DB_NAME}`;

    if (databases.length === 0) {
      console.log(`  Creating test database: ${DB_NAME}`);
      await sql`CREATE DATABASE ${sql(DB_NAME)}`;
    } else {
      console.log(`  ✓ Test database exists: ${DB_NAME}`);
    }

    await sql.end();
  } catch (err) {
    console.error('❌ Failed to check/create test database:', err.message);
    process.exit(1);
  }
}

// Step 2: Run migrations
async function runMigrations() {
  console.log('\n🔧 Running database migrations...');

  return new Promise((resolve, reject) => {
    const migrate = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'inherit',
    });

    migrate.on('close', (code) => {
      if (code === 0) {
        console.log('  ✓ Migrations completed');
        resolve();
      } else {
        reject(new Error(`Migrations failed with code ${code}`));
      }
    });
  });
}

// Step 3: Boot platform-api
function bootPlatformApi() {
  console.log(`\n🎯 Booting platform-api on port ${API_PORT}...`);

  return new Promise((resolve, reject) => {
    const api = spawn('pnpm', ['dev', '--filter=platform-api'], {
      cwd: path.join(__dirname, '../..'),
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        PORT: API_PORT,
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
    });

    api.stdout?.on('data', (data) => {
      const msg = data.toString();
      console.log(`[API] ${msg}`);

      if (msg.includes('listening') || msg.includes('started')) {
        console.log('  ✓ Platform-API is ready');
        resolve(api);
      }
    });

    api.stderr?.on('data', (data) => {
      console.error(`[API Error] ${data}`);
    });

    api.on('error', (err) => {
      reject(new Error(`Failed to boot platform-api: ${err.message}`));
    });

    // Timeout if API doesn't start
    setTimeout(() => {
      reject(new Error('Platform-API startup timeout'));
    }, 30000);
  });
}

// Step 4: Run frontend Playwright tests
async function runFrontendE2E(apiProcess) {
  console.log('\n🧪 Running frontend E2E tests...\n');

  return new Promise((resolve, reject) => {
    const e2e = spawn('pnpm', ['run', 'e2e'], {
      cwd: path.join(__dirname, '../../frontend/apps/portal'),
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        API_BASE_URL: `http://localhost:${API_PORT}/api`,
        PORTAL_BASE_URL: `http://localhost:3000`,
        NODE_ENV: 'test',
      },
      stdio: 'inherit',
    });

    e2e.on('close', (code) => {
      apiProcess.kill();
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`E2E tests failed with code ${code}`));
      }
    });

    e2e.on('error', (err) => {
      apiProcess.kill();
      reject(err);
    });
  });
}

// Main harness execution
async function main() {
  try {
    // Ensure test database
    await ensureTestDatabase();

    // Run migrations
    await runMigrations();

    // Boot platform-api
    const apiProcess = await bootPlatformApi();

    // Wait for API to be ready
    await sleep(2000);

    // Run frontend E2E tests
    await runFrontendE2E(apiProcess);

    console.log('\n✅ Assessment attempt E2E harness passed');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Assessment attempt E2E harness failed:', err.message);
    process.exit(1);
  }
}

// Run the harness
main();
