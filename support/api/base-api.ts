/**
 * BaseAPI — standalone fetch wrapper (ไม่ต้องใช้ browser session)
 *
 * ใช้ global `fetch` (Node 18+ / Bun built-in) แทน Playwright APIRequestContext
 * ทำให้ API tests รันได้โดยไม่ต้อง launch browser เลย
 */
export class BaseAPI {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(
    baseURL: string,
    defaultHeaders: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  ) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.defaultHeaders = defaultHeaders;
  }

  async get(path: string, headers?: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseURL}${path}`, {
      method: 'GET',
      headers: { ...this.defaultHeaders, ...headers },
    });
  }

  async post(path: string, body: unknown, headers?: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: { ...this.defaultHeaders, ...headers },
      body: JSON.stringify(body),
    });
  }

  async put(path: string, body: unknown, headers?: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseURL}${path}`, {
      method: 'PUT',
      headers: { ...this.defaultHeaders, ...headers },
      body: JSON.stringify(body),
    });
  }

  async patch(path: string, body: unknown, headers?: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseURL}${path}`, {
      method: 'PATCH',
      headers: { ...this.defaultHeaders, ...headers },
      body: JSON.stringify(body),
    });
  }

  async delete(path: string, headers?: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseURL}${path}`, {
      method: 'DELETE',
      headers: { ...this.defaultHeaders, ...headers },
    });
  }
}
