/**
 * @file HTTP client module binding AxiosHttpClientAdapter to HTTP_CLIENT_PORT.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { HTTP_CLIENT_PORT } from '../../ports/tokens.js';
import {
  httpConfig,
  HTTP_CONFIG,
} from '../../../../common/config/http.config.js';
import type { HttpConfig as HttpConfigType } from '../../../../common/config/http.config.js';
import { AxiosHttpClientAdapter } from './axios-http-client.adapter.js';

@Module({
  imports: [
    ConfigModule.forFeature(httpConfig),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: HttpConfigType) => ({
        timeout: cfg.timeoutMs,
        maxRedirects: cfg.maxRedirects,
        headers: cfg.baseHeaders,
      }),
      inject: [HTTP_CONFIG],
    }),
  ],
  providers: [
    {
      provide: HTTP_CLIENT_PORT,
      useFactory: (httpService: HttpService, cfg: HttpConfigType) => {
        return new AxiosHttpClientAdapter(httpService.axiosRef, cfg);
      },
      inject: [HttpService, HTTP_CONFIG],
    },
  ],
  exports: [HTTP_CLIENT_PORT],
})
export class HttpClientModule {}
