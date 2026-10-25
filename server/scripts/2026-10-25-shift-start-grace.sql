ALTER TABLE shift_schedule_revisions
  ADD COLUMN grace_minutes TINYINT UNSIGNED NOT NULL DEFAULT 15;
