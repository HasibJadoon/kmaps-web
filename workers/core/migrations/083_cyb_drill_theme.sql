-- 083 — owner 2026-11-27 (kmaps-resources docs/drill-colour-system.md): the drill emphasis palette. A drill's
-- payload.emphasis names at most 2 words and the theme each carries; the worker adds the theme's colour and label from
-- here, so a colour changes in one row, never in the app or in 10k payloads. Six themes, fixed meaning everywhere.
CREATE TABLE IF NOT EXISTS cyb_drill_theme (
  key TEXT PRIMARY KEY,
  label_en TEXT NOT NULL,
  label_ar TEXT,
  color TEXT NOT NULL,
  detail TEXT,
  sort INTEGER NOT NULL DEFAULT 0
);

INSERT OR REPLACE INTO cyb_drill_theme (key, label_en, label_ar, color, detail, sort) VALUES
('threat',   'Threat',    'الوَعِيد',  '#E5484D', 'punishment, warning, the Fire', 10),
('mercy',    'Mercy',     'الرَّحْمَة', '#46A758', 'mercy, promise, glad tidings, forgiveness', 20),
('divine',   'God',       'اللَّه',    '#F5C451', 'God, His names and His acts', 30),
('signs',    'Signs',     'الآيَات',   '#4CB3F0', 'signs, creation, evidence', 40),
('denial',   'Denial',    'الجُحُود',  '#F0883E', 'denial, dispute, arrogance', 50),
('guidance', 'Guidance',  'الهُدَى',   '#A78BFA', 'messengers, guidance, revelation', 60);
