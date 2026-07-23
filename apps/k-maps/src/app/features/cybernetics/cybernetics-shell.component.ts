import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// Shell for the Quran Cybernetics views. Owns the shared dark-gold / Amiri
// palette (as CSS custom properties that cascade to the child routes) and the
// Monitor · Map · Ladder tab bar.
@Component({
  selector: 'km-cybernetics-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="cyb-root">
      <header class="cyb-head">
        <div class="ttl">
          <span class="qar">القرآن</span>
          <div>
            <h1>Quran Cybernetics</h1>
            <p>WorldViews · Arabic · <b>Qurʾān</b> — one closed loop, live from D1</p>
          </div>
        </div>
        <nav class="tabs">
          <a routerLink="monitor" routerLinkActive="on">Control Monitor</a>
          <a routerLink="map" routerLinkActive="on">Quran Map</a>
          <a routerLink="ladder" routerLinkActive="on">Quran Ladder</a>
        </nav>
      </header>
      <router-outlet />
    </div>
  `,
  styles: [`
    :host {
      --bg:#080808; --s1:#141414; --s2:#1a1a1a;
      --gold:#c9a84c; --gold-b:#e8c96a; --gold-d:#7a6432; --bd:rgba(201,168,76,.28); --bd-hi:rgba(201,168,76,.6);
      --text:#f3e7d1; --t2:#c9b79a; --t3:#8a7b68; --arab:#f8eeda;
      --build:#e8c96a; --study:#6bbaff; --content:#4dd9a8; --retn:#c58ad9;
      --ready:#4dd9a8; --blocked:#8a7b68; --done:#6bbaff; --err:#e0785c;
      --serif:'Cinzel',Georgia,serif; --ar:'Amiri','Noto Naskh Arabic','Geeza Pro',serif;
      display:block; min-height:100%;
      color:var(--text);
      background:radial-gradient(1100px 560px at 50% -160px,#171308,var(--bg) 60%) no-repeat;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,Arial,sans-serif;
    }
    .cyb-root { max-width:1200px; margin:0 auto; padding:0 16px 80px; }
    .cyb-head { padding:24px 0 8px; }
    .ttl { display:flex; align-items:center; gap:14px; }
    .ttl .qar { font-family:var(--ar); font-size:40px; color:var(--gold-b); line-height:1; }
    .ttl h1 { font-family:var(--serif); font-size:clamp(20px,3.4vw,27px); color:var(--gold-b); margin:0; }
    .ttl p { color:var(--t2); font-size:13px; margin:3px 0 0; } .ttl p b { color:var(--text); }
    .tabs { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
    .tabs a {
      font-family:var(--serif); font-size:13px; letter-spacing:.04em; text-decoration:none;
      padding:9px 18px; border-radius:11px; border:1px solid var(--bd); background:#0f0f0f; color:var(--t2);
    }
    .tabs a:hover { border-color:var(--bd-hi); color:var(--gold-b); }
    .tabs a.on {
      color:#2a2205; font-weight:700; border-color:var(--gold-b);
      background:linear-gradient(180deg,var(--gold-b),var(--gold));
    }
  `],
})
export class CyberneticsShellComponent {}
