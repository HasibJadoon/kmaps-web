import { Directive, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MorphBlockVm, Tri, Lang } from '../../../../../../../shared/services/quran/quran-surah.service';
import { MorphBlockBody, LangSel } from './morph-block.types';
import { richMarkup } from './morph-rich';
import { safeMorphIcon } from './morph-icons';

@Directive()
export abstract class MorphBlockBase implements MorphBlockBody {
  @Input({ required: true }) block!: MorphBlockVm;
  @Input() lang: LangSel = 'all';
  @Input() heroWord = '';

  protected readonly sanitizer = inject(DomSanitizer);

  t(tri: Tri | null | undefined): string {
    if (!tri) return '';
    const l = this.lang === 'all' ? 'en' : this.lang;
    return (tri[l] ?? tri.en ?? tri.ar ?? '') as string;
  }
  isRtlText(): boolean { return this.lang === 'ar' || this.lang === 'ur'; }

  showAr(ar?: string | null, en?: string | null, ur?: string | null): boolean {
    if (!ar) return false;
    if (this.lang === 'all' || this.lang === 'ar') return true;
    if (this.lang === 'en') return !en;
    return !ur && !en;
  }
  showEn(ar?: string | null, en?: string | null, ur?: string | null): boolean {
    if (!en) return false;
    if (this.lang === 'all' || this.lang === 'en') return true;
    if (this.lang === 'ar') return !ar;
    return !ur;
  }
  showUr(ar?: string | null, en?: string | null, ur?: string | null): boolean {
    return !!ur && (this.lang === 'all' || this.lang === 'ur');
  }

  priAr(text?: string | null): string { return this.isAr(text) ? (text ?? '') : ''; }

  priEn(text?: string | null, en?: string | null): string { return this.isAr(text) ? (en ?? '') : (text ?? ''); }

  txAr(): string { return this.block?.text?.ar ?? ''; }
  txEn(): string { return this.block?.text?.en ?? ''; }
  txUr(): string { return this.block?.text?.ur ?? ''; }
  showTextAr(): boolean { return this.showAr(this.txAr(), this.txEn(), this.txUr()); }
  showTextEn(): boolean { return this.showEn(this.txAr(), this.txEn(), this.txUr()); }
  showTextUr(): boolean { return this.showUr(this.txAr(), this.txEn(), this.txUr()); }
  richTextAr(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(richMarkup(this.txAr(), 'ar')); }
  richTextEn(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(richMarkup(this.txEn(), 'en')); }
  richTextUr(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(richMarkup(this.txUr(), 'ur')); }

  isAr(s: string | null | undefined): boolean {
    const str = String(s ?? '');
    const ar = (str.match(/[؀-ۿ]/g) || []).length;
    const la = (str.match(/[A-Za-z]/g) || []).length;
    return ar > la;
  }

  pick(en: string | null | undefined, ur: string | null | undefined): string {
    return (this.lang === 'ur' && ur) ? ur : (en ?? '');
  }

  pickDir(en: string | null | undefined, ur: string | null | undefined): 'rtl' | 'ltr' {
    return this.isUr(ur) ? 'rtl' : 'ltr';
  }

  isUr(ur: string | null | undefined): boolean { return this.lang === 'ur' && !!ur; }

  isUrText(): boolean { return this.lang === 'ur' && !!this.block?.text?.ur; }

  isUrduScript(s: string | null | undefined): boolean { return /[ٹڈڑںھہۂۃےۓ]/.test(String(s ?? '')); }

  icon(name: string | null | undefined, fallback = 'circle'): string {
    return safeMorphIcon(name, fallback);
  }

  bare(s: string | null | undefined): string { return (s ?? '').replace(/[ً-ْٰـ]/g, ''); }

  rich(str: string | null | undefined): SafeHtml {
    const l = this.lang === 'all' ? 'en' : this.lang;
    return this.sanitizer.bypassSecurityTrustHtml(richMarkup(str, l));
  }
  richText(tri: Tri | null | undefined): SafeHtml {
    const l = this.lang === 'all' ? 'en' : this.lang;
    return this.sanitizer.bypassSecurityTrustHtml(richMarkup(this.t(tri), l));
  }
}
