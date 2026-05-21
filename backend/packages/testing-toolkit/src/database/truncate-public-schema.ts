export interface RawQueryClient {
  $executeRawUnsafe(query: string, ...values: any[]): Promise<any>;
}

export async function truncatePublicSchema(client: RawQueryClient): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await client.$executeRawUnsafe(`
        DO $$
        DECLARE
          table_names text;
        BEGIN
          PERFORM pg_advisory_lock(hashtext('mentrily_test_truncate_public_schema'));
          BEGIN
          SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
          INTO table_names
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename != '_prisma_migrations';

          IF table_names IS NOT NULL THEN
            EXECUTE 'TRUNCATE TABLE ' || table_names || ' RESTART IDENTITY CASCADE';
          END IF;
          EXCEPTION WHEN OTHERS THEN
            PERFORM pg_advisory_unlock(hashtext('mentrily_test_truncate_public_schema'));
            RAISE;
          END;
          PERFORM pg_advisory_unlock(hashtext('mentrily_test_truncate_public_schema'));
        END $$;
      `);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('40P01')) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }

  throw lastError;
}
