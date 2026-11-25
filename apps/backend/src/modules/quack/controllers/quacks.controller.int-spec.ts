import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  resetDatabase,
  signUp,
} from '@test/integration/test-app';
import * as request from 'supertest';

describe('GET /api/quacks (feed)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('turns away a signed-out visitor with 401', async () => {
    await request(app.getHttpServer()).get('/api/quacks').expect(401);
  });

  it('returns the feed to a signed-in user', async () => {
    const cookies = await signUp(app);

    const response = await request(app.getHttpServer())
      .get('/api/quacks')
      .set('Cookie', cookies)
      .expect(200);

    expect(response.body).toEqual([]);
  });
});
