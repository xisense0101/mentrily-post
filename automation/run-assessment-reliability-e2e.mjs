import { execSync } from 'child_process';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is missing in environment.');
  process.exit(1);
}

let dbName = '';

try {
  const url = new URL(databaseUrl);
  dbName = url.pathname.slice(1);

  if (!dbName.includes('test')) {
    console.error(
      `ERROR: Database name "${dbName}" does not contain "test". Refusing to run against a potentially non-test database.`,
    );
    process.exit(1);
  }
} catch {
  console.error('ERROR: Invalid DATABASE_URL format.');
  process.exit(1);
}

function runCommand(command) {
  console.log(`\nExecuting: ${command}`);
  execSync(command, {
    stdio: 'inherit',
    env: { ...process.env },
  });
}

try {
  console.log('--- Assessment Reliability E2E ---');
  console.log(`Target Database: ${dbName}`);
  console.log('----------------------------------');

  runCommand('pnpm --filter @mentrily/data-platform prisma:generate');
  runCommand('pnpm --filter @mentrily/data-platform prisma:migrate:deploy');
  runCommand(
    'pnpm --filter @mentrily/platform-api exec vitest run --config vitest.integration.config.ts --no-isolate src/modules/assessment-delivery/tests/assessment-attempt-concurrency.integration.spec.ts src/modules/assessment-delivery/tests/assessment-attempt-reliability.integration.spec.ts src/modules/assessment-delivery/tests/assessment-attempt-api.integration.spec.ts src/modules/assessment-delivery/tests/assessment-grading-api.integration.spec.ts src/modules/assessment-delivery/tests/assessment-result-api.integration.spec.ts',
  );
  runCommand(
    "pnpm --filter @mentrily/portal exec vitest run --passWithNoTests --exclude='e2e/**' src/test/assessment-first-load-baseline.spec.tsx src/modules/assessment-attempts/tests/assessment-attempt-runner-page.spec.tsx src/modules/assessment-results/tests/learner-result-page.spec.tsx src/modules/assessment-grading/tests/grading-run-page.spec.tsx",
  );

  console.log('\nSUCCESS: Assessment reliability validation passed.');
} catch (error) {
  console.error('\nERROR: Assessment reliability validation failed.');
  throw error;
}
