import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * ApiClient — wrapper บาง ๆ รอบ Playwright APIRequestContext
 *
 * ทำให้ step definitions อ่านง่ายขึ้น:
 *   const res = await api.get('/users');
 *   const res = await api.post('/users', { name: 'Alice' });
 */
export class ApiClient {
  constructor(private request: APIRequestContext) {}

  async get(path: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.request.get(path, { headers });
  }

  async post(path: string, body: unknown, headers?: Record<string, string>): Promise<APIResponse> {
    return this.request.post(path, { data: body, headers });
  }

  async put(path: string, body: unknown, headers?: Record<string, string>): Promise<APIResponse> {
    return this.request.put(path, { data: body, headers });
  }

  async delete(path: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.request.delete(path, { headers });
  }

  // Helper: assert status และ return body ในขั้นตอนเดียว
  async expectJson<T>(response: APIResponse, status = 200): Promise<T> {
    expect(response.status()).toBe(status);
    return response.json() as Promise<T>;
  }
}
