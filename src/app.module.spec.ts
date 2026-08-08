import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppModule } from './app.module';

describe('AppModule - rate limiting config', () => {
  it('imports ThrottlerModule', () => {
    const imports: any[] = Reflect.getMetadata('imports', AppModule) || [];
    expect(imports.some((mod) => mod?.module === ThrottlerModule)).toBe(true);
  });

  it('registers ThrottlerGuard as global APP_GUARD', () => {
    const providers: any[] = Reflect.getMetadata('providers', AppModule) || [];
    expect(
      providers.some(
        (p) => p?.provide === APP_GUARD && p?.useClass === ThrottlerGuard,
      ),
    ).toBe(true);
  });
});
