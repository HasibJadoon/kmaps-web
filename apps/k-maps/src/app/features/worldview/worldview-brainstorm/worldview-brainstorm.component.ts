import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';
import { WorldviewApiService } from '../../../shared/services/worldview/worldview-api.service';
import { KmDatePipe } from '../../../shared/pipes/km-date.pipe';


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
  imports: [KmDatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './worldview-brainstorm.component.html',
  styleUrl: './worldview-brainstorm.component.scss',
})
export class WorldviewBrainstormComponent implements OnInit, AfterViewInit {
  private readonly wv = inject(WorldviewApiService);
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
      const created = await this.wv.createBrainstorm<BrainstormSession>({ title: title.trim(), topic: topic.trim() || undefined, worldview: worldview.trim() || undefined, content: content.trim() || undefined });
      if (created) {
        this.sessions.update(list => [created, ...list]);
        this.selectedSession.set(created);
        this.showCreateForm.set(false);
      }
    } catch {
      this.failure.set('The session could not be created.');
    } finally {
      this.creating.set(false);
    }
  }


  private async loadSessions(): Promise<void> {
    this.loading.set(true);
    try {
      this.sessions.set(await this.wv.brainstormSessions<BrainstormSession>(30));
    } catch {
      this.failure.set('The sessions could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
}
