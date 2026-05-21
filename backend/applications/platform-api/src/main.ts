import 'reflect-metadata';
import { createPlatformApiApp } from './foundation/create-platform-api-app.js';

async function bootstrap() {
  const { app, environment } = await createPlatformApiApp(process.env);
  await app.listen({ port: environment.port, host: '0.0.0.0' });
}

void bootstrap();
