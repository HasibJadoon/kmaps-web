-- A topic belongs to the book it was drawn from. wv_topics had no column for
-- that, so the topics of Said, Rūmī, Arjana and the Lithām essay could not be
-- shown with their book. The ingest named each topic by its book; this
-- records it. The five topics of the Ibn Sīnā / Descartes comparison were all
-- drawn from Peter Adamson's lecture (its claims are reported_by him).
ALTER TABLE wv_topics ADD COLUMN source_id TEXT;
CREATE INDEX IF NOT EXISTS idx_wv_topics_source ON wv_topics (source_id);

UPDATE wv_topics SET source_id = 'src-arjana-muslims-western-imagination-2015' WHERE topic_key LIKE 'arjana-%' AND source_id IS NULL;
UPDATE wv_topics SET source_id = 'src-rumi-masnavi'                            WHERE topic_key LIKE 'rumi-%'   AND source_id IS NULL;
UPDATE wv_topics SET source_id = 'src-said-orientalism-1978'                   WHERE topic_key LIKE 'said-%'   AND source_id IS NULL;
UPDATE wv_topics SET source_id = 'src-litham-mulaththam'                       WHERE topic_key LIKE 'litham-%' AND source_id IS NULL;
UPDATE wv_topics SET source_id = 'wv-src-yt-ok42dabFCs0'
 WHERE id IN ('wv-topic-self-awareness', 'wv-topic-mind-body', 'wv-topic-certainty-foundations',
              'wv-topic-transmission-falsafa-europe', 'wv-topic-essence-existence') AND source_id IS NULL;
