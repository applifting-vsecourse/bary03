/**
 * The database the integration tests run against. Locally it is a separate
 * `quacker_test` database in the Docker Postgres from `pnpm dev`, so tests
 * never touch the dev data. CI points TEST_DATABASE_URL at its own service.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://quacker:quacker@localhost:5433/quacker_test';

/**
 * Every test wipes the database, so refuse to run against anything whose name
 * doesn't say it is a test database. A typo in TEST_DATABASE_URL must not cost
 * someone their dev or production data.
 */
export function assertIsTestDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(
      `Integration tests wipe the database, so they only run against a database whose name ends in "_test" — got "${name}".`,
    );
  }
}
