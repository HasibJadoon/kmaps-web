import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ArabicApiService } from './arabic-api.service';
import { environment } from '../../../environments/environment';

const API = environment.apiBase.replace(/\/+$/, '');

describe('ArabicApiService', () => {
  let svc: ArabicApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(ArabicApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('builds gateway URLs from paths with or without a leading slash', () => {
    expect(svc.url('ar/text/shelf')).toBe(`${API}/ar/text/shelf`);
    expect(svc.url('/ar/intake/1')).toBe(`${API}/ar/intake/1`);
  });

  it('GET passes params and returns the body as sent', () => {
    let body: unknown;
    svc.get('ar/intake', { params: { status: 'new' } }).subscribe((b) => (body = b));
    const req = http.expectOne((r) => r.url === `${API}/ar/intake`);
    expect(req.request.params.get('status')).toBe('new');
    req.flush({ ok: true, data: { items: [] } });
    expect(body).toEqual({ ok: true, data: { items: [] } });
  });

  it('PUT / PATCH / POST use their verbs', () => {
    svc.put('ar/reading/state/w1', { progressSeq: 3 }).subscribe();
    svc.patch('ar/acq/captures/c1', { status: 'done' }).subscribe();
    svc.post('ar/learn/path/s1', { state: 'done' }).subscribe();
    expect(http.expectOne(`${API}/ar/reading/state/w1`).request.method).toBe('PUT');
    expect(http.expectOne(`${API}/ar/acq/captures/c1`).request.method).toBe('PATCH');
    expect(http.expectOne(`${API}/ar/learn/path/s1`).request.method).toBe('POST');
    http.match(() => true).forEach((r) => r.flush({}));
  });
});
