import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { assertIsTestDatabase, TEST_DATABASE_URL } from './test-database';

/**
 * Runs once before all integration tests: brings the test database's schema up
 * to date from our Prisma migrations. `migrate deploy` creates the database
 * first if it doesn't exist yet.
 */
export default function globalSetup(): void {
  assertIsTestDatabase(TEST_DATABASE_URL);

  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
