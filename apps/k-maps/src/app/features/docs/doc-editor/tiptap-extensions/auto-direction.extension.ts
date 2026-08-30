import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LATIN_RE  = /[a-zA-Z]/g;

function detectDir(text: string): 'rtl' | 'ltr' {
  const arabic = text.match(ARABIC_RE)?.length ?? 0;
  if (arabic === 0) return 'ltr';
  const latin = text.match(LATIN_RE)?.length ?? 0;
  return arabic >= latin ? 'rtl' : 'ltr';
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'blockquote']);

const autoDirectionKey = new PluginKey('autoDirection');

export const AutoDirection = Extension.create({
  name: 'autoDirection',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: autoDirectionKey,

        appendTransaction(transactions, _oldState, newState) {

          if (!transactions.some(t => t.docChanged)) return null;

          let scanFrom = newState.doc.content.size;
          let scanTo   = 0;

          for (const t of transactions) {
            if (!t.docChanged) continue;
            for (let i = 0; i < t.steps.length; i++) {
              t.mapping.maps[i].forEach((_oF, _oT, nF, nT) => {
                if (nF < scanFrom) scanFrom = nF;
                if (nT > scanTo)   scanTo   = nT;
              });
            }
          }

          if (scanFrom > scanTo) return null;

          scanFrom = Math.max(0, scanFrom - 2);
          scanTo   = Math.min(newState.doc.content.size, scanTo + 2);

          const tr = newState.tr;
          let changed = false;

          newState.doc.nodesBetween(scanFrom, scanTo, (node, pos) => {
            if (!BLOCK_TYPES.has(node.type.name)) return;
            const text = node.textContent;
            if (!text.trim()) return;
            const dir = detectDir(text);
            if (node.attrs['dir'] !== dir) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, dir });
              changed = true;
            }
          });

          return changed ? tr : null;
        },
      }),
    ];
  },
});
