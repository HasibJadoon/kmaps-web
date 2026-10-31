import { Editor, Extension } from '@tiptap/core';

export interface AyahEmbedText {
  text: string;
  translation: string;
}

/**
 * Where editor nodes load their data from. TipTap extensions live outside Angular's
 * injector, so the editor service configures this with loaders backed by HttpClient
 * services (the auth interceptor then applies). Nodes never call fetch() themselves.
 */
export interface DocDataSourceOptions {
  loadAyah: (surah: number, ayah: number) => Promise<AyahEmbedText | null>;
  loadDocTitle: (docId: string) => Promise<string | null>;
}

export const DocDataSource = Extension.create<DocDataSourceOptions>({
  name: 'kmDataSource',
  addOptions() {
    return {
      loadAyah: async () => null,
      loadDocTitle: async () => null,
    };
  },
});

export function docDataSource(editor: Editor): DocDataSourceOptions | null {
  const ext = editor.extensionManager.extensions.find((e) => e.name === 'kmDataSource');
  return (ext?.options as DocDataSourceOptions | undefined) ?? null;
}
