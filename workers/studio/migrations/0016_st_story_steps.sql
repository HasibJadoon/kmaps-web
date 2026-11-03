-- A story film's production as a studio's steps (owner, 2026-11-04: "my story screen: only selected images, and full
-- Studio, all steps in workspace"): script, pictures, animation, voice, edit, delivery — each with how far it is
-- ([{"key", "label", "icon", "status": "done"|"active"|"todo", "done", "total", "detail"}]). Written by kmaps-resources
-- scripts/series/publish_story_project.py from the project folder, the review and the animation run.
ALTER TABLE st_story ADD COLUMN steps_json TEXT NOT NULL DEFAULT '[]';
