import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../../environments/environment';

// See worldview-compare: this pointed at the Pages origin without the gateway's
// required `/api` prefix, inside a `catch {}`, so the screen has always been an
// empty list that looked like an empty corpus.
const WV_API = `${environment.apiBase}/wv`;

interface BrainstormSession {
  id: number | string;
  title?: string;
  topic?: string;
  worldview?: string;
  content?: string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'km-worldview-brainstorm',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './worldview-brainstorm.component.html',
  styleUrl: './worldview-brainstorm.component.scss',
})
export class WorldviewBrainstormComponent implements OnInit, AfterViewInit {
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly failure = signal<string | null>(null);
  readonly sessions = signal<BrainstormSession[]>([]);
  readonly selectedSession = signal<BrainstormSession | null>(null);
  readonly showCreateForm = signal(false);

  ngOnInit(): void {
    void this.loadSessions();
  }

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.pageRef.nativeElement,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    );
  }

  selectSession(session: BrainstormSession): void {
    this.selectedSession.set(session);
    this.showCreateForm.set(false);
  }

  openCreateForm(): void {
    this.showCreateForm.set(true);
    this.selectedSession.set(null);
  }

  cancelCreate(): void {
    this.showCreateForm.set(false);
  }

  async createSession(title: string, topic: string, worldview: string, content: string): Promise<void> {
    if (!title.trim()) return;
    this.creating.set(true);
    try {
      const res = await fetch(`${WV_API}/brainstorm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), topic: topic.trim() || undefined, worldview: worldview.trim() || undefined, content: content.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { ok: boolean; data: BrainstormSession };
      if (body.data) {
        this.sessions.update(list => [body.data, ...list]);
        this.selectedSession.set(body.data);
        this.showCreateForm.set(false);
      }
    } catch {
      this.failure.set('The session could not be created.');
    } finally {
      this.creating.set(false);
    }
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  private async loadSessions(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await fetch(`${WV_API}/brainstorm?limit=30`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { ok: boolean; data: BrainstormSession[] };
      this.sessions.set(Array.isArray(body.data) ? body.data : []);
    } catch {
      this.failure.set('The sessions could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
}
