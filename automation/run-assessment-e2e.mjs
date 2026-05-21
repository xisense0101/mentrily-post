import { execSync } from 'child_process';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is missing in environment.');
  process.exit(1);
}

function validateDatabaseUrl(urlValue) {
  try {
    const url = new URL(urlValue);
    const dbName = url.pathname.slice(1);

    if (!dbName.includes('test')) {
      console.error(
        `ERROR: Database name "${dbName}" does not contain "test". Refusing to run Assessment Builder E2E against a potentially non-test database.`,
      );
      process.exit(1);
    }

    console.log('--- Assessment E2E Configuration ---');
    console.log(`Target Database: ${dbName}`);
    console.log(`Host/Port:       ${url.host}`);
    console.log('---------------------------------');
  } catch {
    console.error('ERROR: Invalid DATABASE_URL format.');
    process.exit(1);
  }
}

function runCommand(command) {
  console.log(`\nExecuting: ${command}`);
  execSync(command, {
    stdio: 'inherit',
    env: { ...process.env },
  });
}

try {
  validateDatabaseUrl(databaseUrl);
  runCommand('pnpm --filter @mentrily/data-platform prisma:generate');
  runCommand('pnpm --filter @mentrily/data-platform prisma:migrate:deploy');
  runCommand(
    'ASSESSMENT_PLAYWRIGHT_HARNESS=true NEXT_PUBLIC_PLATFORM_API_URL=http://localhost:3001 NEXT_PUBLIC_E2E_TEST_MODE=true PLATFORM_API_URL=http://localhost:3001 pnpm --filter @mentrily/platform-api exec vitest run --config vitest.integration.config.ts --no-isolate src/modules/assessment-delivery/tests/assessment-playwright.e2e.spec.ts',
  );

  console.log('\nSUCCESS: Assessment Builder E2E passed.');
} catch (error) {
  console.error('\nERROR: Assessment Builder E2E failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
