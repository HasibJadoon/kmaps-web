import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';

@Component({
  selector: 'km-surah-structures',
  standalone: true,
  imports: [QuranPageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-structures.component.html',
  styleUrl: './surah-structures.component.scss',
})
export class SurahStructuresComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  surahId = signal(0);

  ngOnInit(): void {
    this.surahId.set(Number(this.route.snapshot.paramMap.get('surahId')) || 0);
  }

  back(): void { this.router.navigate(['/quran']); }
}
