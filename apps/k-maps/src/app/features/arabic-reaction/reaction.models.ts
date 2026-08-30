export interface Scene {
  id: string;
  title: string;

  start: number;

  end: number;
}

export interface TranscriptLine {
  id: string;

  start: number;

  end: number;

  text: string;

  sceneId: string;
}

export interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  root?: string;
  example?: string;
}

export interface IdiomItem {
  id: string;
  phrase: string;
  meaning: string;
  context?: string;
}

export interface SentenceItem {
  id: string;
  text: string;
  translation: string;
  note?: string;
}

export interface SceneContent {
  sceneId: string;
  vocab: VocabItem[];
  idioms: IdiomItem[];
  sentences: SentenceItem[];
  notes?: string;
}

export interface ReactionLessonData {
  unitId: string;
  title: string;

  youtubeId: string;
  scenes: Scene[];
  transcript: TranscriptLine[];

  content: SceneContent[];
}
