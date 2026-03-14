import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Nest сам корректно завершит приложение, а Prisma закроется через onModuleDestroy
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = Number(config.get("PORT") ?? 4000);

  const originRaw = (config.get("CORS_ORIGIN") ?? "http://localhost:3000") as string;
  const allowed = originRaw.split(",").map((s) => s.trim()).filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      // запросы без Origin (curl/postman) — разрешаем
      if (!origin) return cb(null, true);
      return allowed.includes(origin) ? cb(null, true) : cb(new Error("CORS blocked"), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    })
  );

  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
