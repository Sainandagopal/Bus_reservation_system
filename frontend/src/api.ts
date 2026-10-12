import type { Booking, Bus, BusCategory, BusPayload, DashboardStats, SeatMap, User } from './types';

let csrfToken = '';

async function initialiseCsrf(): Promise<void> {
  const response = await fetch('/api/auth/csrf', { credentials: 'include' });
  if (!response.ok) throw new Error('Could not initialise a secure session. Restart the backend and retry.');
  const data = await response.json() as { token: string };
  csrfToken = data.token;
}

function isUnsafe(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  if (isUnsafe(method) && !csrfToken) await initialiseCsrf();

  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (isUnsafe(method) && csrfToken) headers.set('X-XSRF-TOKEN', csrfToken);

  const response = await fetch(path, { ...options, method, headers, credentials: 'include' });
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    if (response.status === 403 && typeof payload !== 'string') {
      throw new Error(payload?.message ?? 'Your session has expired. Refresh the page and sign in again.');
    }
    throw new Error(typeof payload === 'string' ? payload : payload?.message ?? 'The request could not be completed.');
  }
  return payload as T;
}

export const api = {
  async me() { return request<User>('/api/auth/me'); },
  async login(username: string, password: string) {
    return request<User>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  },
  async register(username: string, displayName: string, password: string) {
    return request<{ message: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, displayName, password }) });
  },
  async logout() {
    const result = await request<{ message: string }>('/api/auth/logout', { method: 'POST', body: '{}' });
    csrfToken = '';
    await initialiseCsrf().catch(() => undefined);
    return result;
  },
  async searchBuses(filters: { source?: string; destination?: string; journeyDate: string; category?: BusCategory | '' }) {
    const params = new URLSearchParams();
    if (filters.source?.trim()) params.set('source', filters.source.trim());
    if (filters.destination?.trim()) params.set('destination', filters.destination.trim());
    params.set('journeyDate', filters.journeyDate);
    if (filters.category) params.set('category', filters.category);
    return request<Bus[]>(`/api/buses?${params.toString()}`);
  },
  async seats(busId: number, journeyDate: string) {
    const params = new URLSearchParams({ journeyDate });
    return request<SeatMap>(`/api/buses/${busId}/seats?${params.toString()}`);
  },
  async myBookings() { return request<Booking[]>('/api/user/bookings'); },
  async book(busId: number, journeyDate: string, passengers: { seatNumber: number; name: string; age: number; gender: string }[]) {
    return request<Booking[]>('/api/user/bookings', {
      method: 'POST',
      body: JSON.stringify({ busId, journeyDate, passengers }),
    });
  },
  async cancelMyBooking(code: string) {
    return request<Booking>(`/api/user/bookings/${encodeURIComponent(code)}/cancel`, { method: 'POST', body: '{}' });
  },
  async dashboard() { return request<DashboardStats>('/api/admin/dashboard'); },
  async adminBuses(journeyDate: string) {
    const params = new URLSearchParams({ journeyDate });
    return request<Bus[]>(`/api/admin/buses?${params.toString()}`);
  },
  async createBus(payload: BusPayload) {
    return request<Bus>('/api/admin/buses', { method: 'POST', body: JSON.stringify(payload) });
  },
  async updateBus(id: number, payload: BusPayload) {
    return request<Bus>(`/api/admin/buses/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  async deleteBus(id: number) {
    return request<{ message: string }>(`/api/admin/buses/${id}`, { method: 'DELETE' });
  },
  async allBookings() { return request<Booking[]>('/api/admin/bookings'); },
  async cancelBooking(code: string) {
    return request<Booking>(`/api/admin/bookings/${encodeURIComponent(code)}/cancel`, { method: 'POST', body: '{}' });
  },
};
