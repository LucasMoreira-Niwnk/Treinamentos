CREATE TABLE IF NOT EXISTS portal_users (
  sub TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS training_courses (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  duration INTEGER NOT NULL,
  lessons TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS training_completions (
  user_sub TEXT NOT NULL,
  course_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  score INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (user_sub, course_id)
);

CREATE INDEX IF NOT EXISTS idx_training_completions_course_id
  ON training_completions(course_id);
