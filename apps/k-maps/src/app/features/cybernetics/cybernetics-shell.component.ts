import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'km-cybernetics-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="cyb-root">
      <header class="cyb-head">
        <!-- Getting out. This section had no route home at all: once you were
             in /cybernetics the only way back to the app was the browser's
             own back button or editing the URL. -->
        <a class="home" routerLink="/home"><span class="chev">‹</span> Home</a>
        <div class="ttl">
          <span class="qar">القرآن</span>
          <div>
            <h1>Cybernetics</h1>
            <p>WorldViews · Arabic · <b>Qurʾān</b> — one closed loop, live from D1</p>
          </div>
        </div>
        <nav class="tabs">
          <a routerLink="dashboard" routerLinkActive="on">Dashboard</a>
          <a routerLink="monitor" routerLinkActive="on">Control Monitor</a>
          <a routerLink="map" routerLinkActive="on">Quran Map</a>
          <a routerLink="ladder" routerLinkActive="on">Quran Ladder</a>
        </nav>
      </header>
      <router-outlet />
    </div>
  `,
  styles: [`
    /* ── The app's manuscript-noir system ──
       These are the same tokens the Lexicon reader defines (shared/styles/
       _reader-chrome.scss), not a second palette that happens to look similar.
       Cybernetics used to carry its own darker ground and neon axis hues, which
       is why it read as a different product from every other screen. */
    :host {
      --bg:#0b0a08; --paper:#141210; --paper-2:#1c160f; --paper-3:#241c12;
      --ink:#ede0c4; --ink-soft:#b7ac90; --ink-faint:#8a7e63;
      --rule:rgba(201,168,76,.16); --rule-soft:rgba(201,168,76,.08); --rule-strong:#6f5a2e;
      --accent:#c9a84c; --accent-bright:#e8c96a; --accent-soft:rgba(201,168,76,.10);
      --verse:#7fae6a; --clarity:#6f93c9; --kw:#cf8a7a; --kw-strong:#b24a38;
      --ref:#8fa8c9; --sep:#b24a38; --disc:#5b7ba8;
      --glow:0 0 40px rgba(201,168,76,.14);

      /* The names the cybernetics screens already speak, pointed at the system
         above so every one of them moves without being rewritten. */
      --s1:var(--paper); --s2:var(--paper-2);
      --gold:var(--accent); --gold-b:var(--accent-bright); --gold-d:var(--rule-strong);
      --bd:var(--rule); --bd-hi:rgba(201,168,76,.45);
      --text:var(--ink); --t2:var(--ink-soft); --t3:var(--ink-faint); --arab:var(--ink);
      /* The four outputs, in the reader's own semantic hues rather than neon:
         a dashboard is not a different product from the book it measures. */
      --build:var(--accent-bright); --study:var(--clarity); --content:var(--verse); --retn:#a98fc9;
      --ready:var(--verse); --blocked:var(--ink-faint); --done:var(--clarity); --err:var(--kw);
      --serif:'Cinzel',Georgia,serif; --ar:var(--km-font-arabic-ui);
      display:block; min-height:100%;
      color:var(--ink);
      background:radial-gradient(1100px 560px at 50% -200px,#171308,var(--bg) 62%) no-repeat var(--bg);
      font-family:'Poppins',-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,Arial,sans-serif;
    }
    .cyb-root { max-width:1200px; margin:0 auto; padding:0 16px 80px; }
    .cyb-head { padding:18px 0 8px; }
    /* The Lexicon's back affordance, same shape, pointed at Home. */
    .home {
      display:inline-flex; align-items:center; gap:6px; text-decoration:none;
      color:var(--ink-soft); font-size:.82rem; font-weight:500;
      padding:7px 12px; margin:0 0 12px -12px; border-radius:9px;
      transition:background .15s, color .15s;
    }
    .home:hover { background:var(--paper-2); color:var(--ink); }
    .home .chev { color:var(--accent); font-size:1.05rem; line-height:1; }
    .ttl { display:flex; align-items:center; gap:14px; }
    .ttl .qar { font-family:var(--km-font-arabic-ui); font-size:40px; color:var(--gold-b); line-height:1; }
    .ttl h1 { font-family:var(--serif); font-size:clamp(20px,3.4vw,27px); color:var(--gold-b); margin:0; }
    .ttl p { color:var(--t2); font-size:13px; margin:3px 0 0; } .ttl p b { color:var(--text); }
    .tabs { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
    .tabs a {
      font-family:var(--serif); font-size:13px; letter-spacing:.04em; text-decoration:none;
      padding:9px 18px; border-radius:11px; border:1px solid var(--rule); background:var(--paper); color:var(--ink-soft);
      transition:background .15s, color .15s, border-color .15s;
    }
    .tabs a:hover { border-color:var(--bd-hi); color:var(--accent-bright); background:var(--paper-2); }
    .tabs a.on {
      color:var(--bg); font-weight:700; border-color:var(--accent);
      background:linear-gradient(180deg,var(--accent-bright),var(--accent));
    }
  `],
})
export class CyberneticsShellComponent {}
