CREATE TABLE IF NOT EXISTS rider_status_operations (
  rider_id VARCHAR(191) NOT NULL,
  operation_id VARCHAR(191) NOT NULL,
  request_id VARCHAR(191) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  delivery_status VARCHAR(32) NOT NULL,
  response_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rider_id, operation_id),
  KEY idx_rider_status_operations_request (rider_id, request_id)
);
