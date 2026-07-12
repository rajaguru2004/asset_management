import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { join } from 'path';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  // Serve static files from uploads directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS (supports comma-separated list of origins)
  const corsOrigin = process.env.CORS_ORIGIN;
  const origins = corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim())
    : true;

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('AssetFlow API')
    .setDescription('Auth, RBAC & Organization Setup (Module 1 + 3)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Login, signup, session')
    .addTag('Employee Directory', 'Users + live role promotion')
    .addTag('Departments', 'Org units, hierarchy, heads')
    .addTag('Asset Categories', 'Categories + custom fields')
    .addTag('Assets', 'Registry: tag generation, custom fields, lifecycle')
    .addTag('Allocations', 'Custody, transfers, overdue tracking')
    .addTag('Bookings', 'Resource time-sharing, availability, calendar')
    .addTag('Maintenance', 'Repair workflow: approve, assign, start, resolve')
    .addTag('Dashboard', 'KPI stats')
    .addTag('Health', 'Service health')
    .addTag('Libraries', 'Generic vocabularies (location, fuel type, ...)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Asset Management API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
