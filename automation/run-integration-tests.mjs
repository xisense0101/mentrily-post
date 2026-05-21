import { execSync } from 'child_process';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is missing in environment.');
  process.exit(1);
}

try {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);

  if (!dbName.includes('test')) {
    console.error(
      `ERROR: Database name "${dbName}" does not contain "test". Refusing to run integration tests against a potentially non-test database.`,
    );
    process.exit(1);
  }

  console.log('--- Integration Test Configuration ---');
  console.log(`Target Database: ${dbName}`);
  console.log(`Host/Port:       ${url.host}`);
  console.log('---------------------------------------');
} catch (error) {
  console.error('ERROR: Invalid DATABASE_URL format.');
  process.exit(1);
}

function runCommand(command) {
  console.log(`\nExecuting: ${command}`);
  try {
    execSync(command, {
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (error) {
    console.error(`\nFAILED: ${command}`);
    throw error; // Rethrow to stop execution
  }
}

try {
  // 1. Ensure schema is generated and deployed
  runCommand('pnpm --filter @mentrily/data-platform prisma:generate');
  runCommand('pnpm --filter @mentrily/data-platform prisma:migrate:deploy');

  // 2. Run data-platform integration tests
  runCommand('pnpm --filter @mentrily/data-platform test:integration');

  // 3. Run platform-api integration tests
  runCommand('pnpm --filter @mentrily/platform-api test:integration');

  console.log('\nSUCCESS: All integration tests passed.');
} catch (error) {
  console.error('\nERROR: Integration test suite failed.');
  process.exit(1);
}
