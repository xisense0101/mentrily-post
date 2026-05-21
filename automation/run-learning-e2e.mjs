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
      `ERROR: Database name "${dbName}" does not contain "test". Refusing to run learning E2E.`,
    );
    process.exit(1);
  }

  console.log('--- Learning E2E Configuration ---');
  console.log(`Target Database: ${dbName}`);
  console.log('Backend URL:     http://localhost:3001');
  console.log('Frontend URL:    http://localhost:3000');
  console.log('-----------------------------------');
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
  runCommand('pnpm --filter @mentrily/data-platform prisma:generate');
  runCommand('pnpm --filter @mentrily/data-platform prisma:migrate:deploy');
  runCommand(
    'LEARNING_PLAYWRIGHT_HARNESS=true pnpm --filter @mentrily/platform-api exec vitest run src/modules/learning-delivery/tests/learning-playwright.e2e.spec.ts --config vitest.integration.config.ts',
  );
} catch (error) {
  console.error('\nERROR: Learning E2E workflow failed.');
  process.exit(1);
}
