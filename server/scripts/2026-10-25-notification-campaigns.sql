CREATE TABLE IF NOT EXISTS notification_campaigns (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  notification_title VARCHAR(120) NOT NULL,
  notification_body VARCHAR(500) NOT NULL,
  status ENUM('draft','scheduled','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
  target_type ENUM('all_riders','selected_riders','no_attendance','present','absent_or_leave','on_duty','off_duty','active_tasks','overdue_tasks') NOT NULL,
  schedule_type ENUM('immediate','one_time','recurring') NOT NULL DEFAULT 'one_time',
  start_date DATE NOT NULL,
  end_date DATE NULL,
  send_time TIME NOT NULL,
  time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Manila',
  weekdays JSON NULL,
  repeat_interval_minutes INT NULL,
  max_sends_per_rider INT NOT NULL DEFAULT 1,
  destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',
  next_run_at DATETIME NULL,
  last_run_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_by VARCHAR(191) NOT NULL,
  updated_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campaign_status_start (status, start_date, send_time)
);

CREATE TABLE IF NOT EXISTS notification_campaign_recipients (
  campaign_id VARCHAR(64) NOT NULL,
  rider_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (campaign_id, rider_id),
  CONSTRAINT fk_campaign_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_campaign_deliveries (
  id VARCHAR(64) PRIMARY KEY,
  campaign_id VARCHAR(64) NOT NULL,
  rider_id VARCHAR(191) NOT NULL,
  scheduled_at DATETIME NOT NULL,
  attempt_number INT NOT NULL DEFAULT 1,
  status ENUM('pending','processing','sent','failed','skipped') NOT NULL DEFAULT 'pending',
  provider_message_id VARCHAR(255) NULL,
  notification_id VARCHAR(64) NULL,
  failure_reason VARCHAR(500) NULL,
  idempotency_key VARCHAR(191) NOT NULL,
  sent_at DATETIME NULL,
  action_type VARCHAR(32) NULL,
  acted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campaign_delivery_idempotency (idempotency_key),
  INDEX idx_campaign_delivery_campaign (campaign_id, created_at),
  CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_campaign_worker_state (
  worker_key VARCHAR(64) PRIMARY KEY,
  last_started_at DATETIME NULL,
  last_completed_at DATETIME NULL,
  last_status VARCHAR(16) NOT NULL DEFAULT 'idle',
  last_error VARCHAR(500) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
