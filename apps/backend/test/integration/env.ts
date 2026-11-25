import { assertIsTestDatabase, TEST_DATABASE_URL } from './test-database';

// Runs before each test file's imports, so the app's Config and PrismaService
// read these values instead of anything left over in the shell. The values
// match .env.example; only the database differs.
assertIsTestDatabase(TEST_DATABASE_URL);

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.BETTER_AUTH_SECRET ??= 'integration_test_secret';
process.env.BACKEND_URL ??= 'http://localhost:4050';
process.env.FRONTEND_URL ??= 'http://localhost:3050';
// The test app stubs the mailer; this also keeps a real provider out of reach.
delete process.env.RESEND_API_KEY;
delete process.env.SMTP_HOST;
