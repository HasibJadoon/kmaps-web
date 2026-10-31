import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HubApiService } from './hub-api.service';
import { environment } from '../../../environments/environment';

const API = environment.apiBase.replace(/\/+$/, '');

describe('HubApiService', () => {
  let svc: HubApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(HubApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists through the gateway, not the page origin', () => {
    svc.list('/wv/sources?limit=50&offset=0').subscribe();
    const req = http.expectOne(`${API}/wv/sources?limit=50&offset=0`);
    expect(req.request.method).toBe('GET');
    req.flush({ ok: true, data: [] });
  });

  it('creates with a JSON body', () => {
    svc.create('/core/workspaces', { name: 'W' }).subscribe();
    const req = http.expectOne(`${API}/core/workspaces`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'W' });
    req.flush({ ok: true });
  });
});
