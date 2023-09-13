import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // 支持static目录下静态资源的访问 用pages作前缀
  app.useStaticAssets('static', {prefix: '/pages'})
  await app.listen(3000);
}
bootstrap();
