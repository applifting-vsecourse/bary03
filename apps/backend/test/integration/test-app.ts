import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';
import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { PrismaService } from '@/core/prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

/** The real Nest app (same wiring as main.ts), connected to the test database. */
export async function createTestApp(): Promise<INestApplication> {
  // Emails are the one thing swapped out: sign-up still renders and "sends"
  // the verification email, it just doesn't print it into the test output.
  const silentEmail: EmailService = { sendEmail: async () => {} };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider('EmailService')
    .useValue(silentEmail)
    .compile();

  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();
  return app;
}

/**
 * Empties every table except Prisma's migration history, so each test starts
 * from a blank database and can't depend on what an earlier test left behind.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;

  const list = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

type TestUser = { email: string; password: string; name: string };

/**
 * Signs a new user up through the real BetterAuth endpoint and returns the
 * session cookie to send with requests made as that user.
 */
export async function signUp(
  app: INestApplication,
  user: TestUser = {
    email: 'duck@example.com',
    password: 'password1',
    name: 'Test Duck',
  },
): Promise<string[]> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/sign-up/email')
    .set('Origin', process.env.FRONTEND_URL ?? '')
    .send(user)
    .expect(200);

  const cookies = response.get('Set-Cookie');
  if (!cookies?.length) {
    throw new Error('Sign-up succeeded but returned no session cookie');
  }
  return cookies;
}
