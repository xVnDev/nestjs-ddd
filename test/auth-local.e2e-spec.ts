import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { HttpCode } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { LocalAuthGuard } from '../src/modules/auth/interfaces/guards/local-auth.guard.js';
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { createSeededFaker } from '../src/common/fixtures/seeded-faker.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { PASSWORD_HASHER, USER_REPOSITORY } from '../src/modules/shared/ports/tokens.js';
import { User } from '../src/modules/user/domain/entities/user.entity.js';
import { Sub } from '../src/modules/user/domain/value-objects/sub.vo.js';
import { DomainExceptionFilter } from '../src/common/filters/index.js';

class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}

@Controller('test-auth')
class TestAuthController {
  @Post()
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  public login(@Body() _dto: LoginDto, @Req() req: { user: unknown }) {
    return req.user;
  }
}

describe('Auth local (e2e)', () => {
  let app: INestApplication;
  const faker = createSeededFaker(7);
  const email = faker.internet.email().toLowerCase();
  const password = faker.internet.password({ length: 12 });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [TestAuthController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    const users = moduleRef.get(USER_REPOSITORY);
    const hasher = moduleRef.get(PASSWORD_HASHER);
    const hash = await hasher.hash(password);
    const user = User.createLocal({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email,
      passwordHash: hash,
      isActive: true,
    });
    await users.save(user);
  });

  afterAll(async () => {
    await app.close();
  });

  it('authenticates valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/test-auth')
      .send({ email, password })
      .expect(200);
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('email', email);
  });

  it('returns identical 401 bodies for wrong password and unknown email', async () => {
    const wrong = await request(app.getHttpServer())
      .post('/test-auth')
      .send({ email, password: 'definitely-wrong' })
      .expect(401);
    const unknown = await request(app.getHttpServer())
      .post('/test-auth')
      .send({ email: 'no-such-user@example.com', password })
      .expect(401);

    expect(JSON.stringify(wrong.body)).toBe(JSON.stringify(unknown.body));
  });

  it('rejects malformed credentials', async () => {
    await request(app.getHttpServer())
      .post('/test-auth')
      .send({ email })
      .expect(400);
  });
});

