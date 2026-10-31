import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorldviewApiService } from './worldview-api.service';
import { environment } from '../../../../environments/environment';

const API = environment.apiBase.replace(/\/+$/, '');

describe('WorldviewApiService', () => {
  let svc: WorldviewApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(WorldviewApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('unwraps the brainstorm list and passes the limit', async () => {
    const p = svc.brainstormSessions<{ id: number }>(30);
    const req = http.expectOne((r) => r.url === `${API}/wv/brainstorm`);
    expect(req.request.params.get('limit')).toBe('30');
    req.flush({ ok: true, data: [{ id: 1 }] });
    expect(await p).toEqual([{ id: 1 }]);
  });

  it('turns a non-array list into []', async () => {
    const p = svc.comparisons(20);
    http.expectOne((r) => r.url === `${API}/wv/comparisons`).flush({ ok: true, data: null });
    expect(await p).toEqual([]);
  });

  it('posts a new brainstorm session', async () => {
    const p = svc.createBrainstorm<{ id: number }>({ title: 'T' });
    const req = http.expectOne(`${API}/wv/brainstorm`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'T' });
    req.flush({ ok: true, data: { id: 9 } });
    expect(await p).toEqual({ id: 9 });
  });

  it('reads a contrast by scope, null when the worker sends none', async () => {
    const p = svc.contrast(30, 2, 6);
    http.expectOne(`${API}/wv/positions/contrast/30/2-6`).flush({ ok: true, data: null });
    expect(await p).toBeNull();
  });

  it('lists the passages that have a contrast', async () => {
    const p = svc.contrastPassages<{ label: string }>();
    http.expectOne(`${API}/wv/positions/contrast`).flush({ ok: true, data: { passages: [{ label: 'al-Rūm 30:2–6' }] } });
    expect(await p).toEqual([{ label: 'al-Rūm 30:2–6' }]);
  });

  it('rejects on HTTP errors so screens can show their failure state', async () => {
    const p = svc.counts();
    http.expectOne(`${API}/worldview/counts`).flush({}, { status: 500, statusText: 'err' });
    await expect(p).rejects.toBeTruthy();
  });
});
