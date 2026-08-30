import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { YoutubePlayerComponent } from './youtube-player.component';
import { SceneListComponent } from './scene-list.component';
import { TranscriptPanelComponent } from './transcript-panel.component';
import { VocabPanelComponent } from './vocab-panel.component';
import { CameraPlaceholderComponent } from './camera-placeholder.component';

import { ReactionLessonData, Scene, SceneContent } from './reaction.models';
import { MOCK_REACTION_LESSON } from './reaction.mock';

@Component({
  selector: 'km-reaction-screen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    YoutubePlayerComponent,
    SceneListComponent,
    TranscriptPanelComponent,
    VocabPanelComponent,
    CameraPlaceholderComponent,
  ],
  templateUrl: './reaction-screen.component.html',
  styleUrl: './reaction-screen.component.css',
})
export class ReactionScreenComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(YoutubePlayerComponent) private ytPlayer?: YoutubePlayerComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  lesson = signal<ReactionLessonData | null>(null);

  leftCollapsed = signal(false);

  currentTime = signal(0);

  activeLineId = computed<string | null>(() => {
    const t = this.currentTime();
    const data = this.lesson();
    if (!data) return null;
    const line = data.transcript.find((l) => t >= l.start && t < l.end);
    return line?.id ?? null;
  });

  activeSceneId = computed<string | null>(() => {
    const lineId = this.activeLineId();
    const data = this.lesson();
    if (!data || !lineId) return null;
    const line = data.transcript.find((l) => l.id === lineId);
    return line?.sceneId ?? null;
  });

  activeContent = computed<SceneContent | null>(() => {
    const sceneId = this.activeSceneId();
    const data = this.lesson();
    if (!data || !sceneId) return null;
    return data.content.find((c) => c.sceneId === sceneId) ?? null;
  });

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastActiveLineId: string | null = null;

  ngOnInit(): void {
    const unitId = this.route.snapshot.paramMap.get('unitId');

    const data = { ...MOCK_REACTION_LESSON, unitId: unitId ?? MOCK_REACTION_LESSON.unitId };
    this.lesson.set(data);
  }

  ngAfterViewInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    this.zone.runOutsideAngular(() => {
      this.pollInterval = setInterval(() => {
        const time = this.ytPlayer?.getCurrentTime() ?? 0;
        const currentLineId = this.computeActiveLineId(time);

        if (currentLineId !== this.lastActiveLineId) {
          this.lastActiveLineId = currentLineId;
          this.zone.run(() => {
            this.currentTime.set(time);
            this.cdr.markForCheck();
          });
        } else {

          this.currentTime.set(time);
        }
      }, 200);
    });
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private computeActiveLineId(t: number): string | null {
    const data = this.lesson();
    if (!data) return null;
    return data.transcript.find((l) => t >= l.start && t < l.end)?.id ?? null;
  }

  onSceneSelect(scene: Scene): void {
    this.ytPlayer?.seekTo(scene.start);
    this.ytPlayer?.play();
    this.currentTime.set(scene.start);
    this.cdr.markForCheck();
  }

  onTranscriptSeek(seconds: number): void {
    this.ytPlayer?.seekTo(seconds);
    this.ytPlayer?.play();
    this.currentTime.set(seconds);
    this.cdr.markForCheck();
  }

  toggleLeft(): void {
    this.leftCollapsed.update((v) => !v);
  }

  back(): void {
    this.router.navigate(['/arabic/library']);
  }
}
