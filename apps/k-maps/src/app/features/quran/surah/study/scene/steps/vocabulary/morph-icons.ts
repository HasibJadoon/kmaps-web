import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import {
  Dna, Ruler, GitFork, Tag, BookOpen, Landmark, Waypoints, Feather, Eye, GitCompare,
  Languages, ListOrdered, TrendingUp, Library, Grid3x3, Sparkles, Orbit,
  Sunrise, Star, Scale, Split, LayoutGrid, KeyRound, Link, Circle, MapPin, Quote,
} from 'lucide-angular';

export const MORPH_LUCIDE = {
  Dna, Ruler, GitFork, Tag, BookOpen, Landmark, Waypoints, Feather, Eye, GitCompare,
  Languages, ListOrdered, TrendingUp, Library, Grid3x3, Sparkles, Orbit,
  Sunrise, Star, Scale, Split, LayoutGrid, KeyRound, Link, Circle, MapPin, Quote,
};

export function provideMorphIcons() {
  return { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(MORPH_LUCIDE) };
}

const MORPH_ICON_KEYS = new Set(Object.keys(MORPH_LUCIDE).map(k => k.toLowerCase()));

export function safeMorphIcon(name: string | null | undefined, fallback = 'circle'): string {
  const key = String(name ?? '').replace(/[-_\s]/g, '').toLowerCase();
  return key && MORPH_ICON_KEYS.has(key) ? String(name) : fallback;
}
