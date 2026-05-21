export function assertSafeIntegrationDatabaseUrl(databaseUrl: string | undefined): { dbName: string; host: string } {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing.');
  }

  try {
    const url = new URL(databaseUrl);
    const dbName = url.pathname.slice(1);

    if (!dbName.includes('test')) {
      throw new Error(`Database name "${dbName}" does not contain "test". Refusing to run integration tests against a potentially non-test database.`);
    }

    return { dbName, host: url.host };
  } catch (error) {
    if (error instanceof Error && error.message.includes('test')) {
      throw error;
    }
    throw new Error('Invalid DATABASE_URL format.');
  }
}
