CREATE TABLE training_completions_new (
  user_sub TEXT NOT NULL,
  course_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  score INTEGER,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (user_sub, course_id)
);

INSERT INTO training_completions_new (user_sub, course_id, user_email, score, completed_at)
SELECT user_sub, course_id, user_email, score, completed_at FROM training_completions;

DROP TABLE training_completions;
ALTER TABLE training_completions_new RENAME TO training_completions;
CREATE INDEX IF NOT EXISTS idx_training_completions_course_id
  ON training_completions(course_id);
