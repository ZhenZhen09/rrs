ALTER TABLE attendance_logs
  ADD COLUMN absence_source VARCHAR(32) NULL,
  ADD COLUMN auto_absent_at DATETIME NULL,
  ADD COLUMN late_checkin_approved_by VARCHAR(255) NULL,
  ADD COLUMN late_checkin_approved_at DATETIME NULL;
