-- Database Schema for Rider Scheduling & Delivery System

CREATE DATABASE IF NOT EXISTS rider_scheduling;
USE rider_scheduling;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'personnel', 'rider') NOT NULL,
    department VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL, -- Assuming hashed passwords for production
    require_password_reset BOOLEAN DEFAULT FALSE,
    push_subscription JSON, -- New column for Web Push tokens
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Delivery Requests Table
CREATE TABLE IF NOT EXISTS delivery_requests (
    request_id VARCHAR(50) PRIMARY KEY,
    requester_id VARCHAR(50) NOT NULL,
    requester_name VARCHAR(255) NOT NULL,
    requester_department VARCHAR(100),
    
    delivery_date DATE NOT NULL,
    time_window VARCHAR(50) NOT NULL,
    
    -- Pickup Location details
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    pickup_address TEXT NOT NULL,
    
    -- Dropoff Location details
    dropoff_lat DECIMAL(10, 8),
    dropoff_lng DECIMAL(11, 8),
    dropoff_address TEXT NOT NULL,

    -- Live Tracking details (Grab-like feature)
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    
    recipient_name VARCHAR(255) NOT NULL,
    recipient_contact VARCHAR(50) NOT NULL,
    
    request_type ENUM('Bank Transaction', 'Countering', 'Delivery/Pickup', 'Others') NOT NULL DEFAULT 'Delivery/Pickup',
    urgency_level ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
    on_behalf_of VARCHAR(255),
    
    status ENUM('pending', 'approved', 'disapproved', 'returned_for_revision') DEFAULT 'pending',
    
    assigned_rider_id VARCHAR(50),
    assigned_rider_name VARCHAR(255),
    delivery_status ENUM('pending', 'assigned', 'picked_up', 'in_transit', 'in_progress', 'delivered', 'completed', 'failed'),
    
    admin_remark TEXT,
    rider_remark TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_rider_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    request_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES delivery_requests(request_id) ON DELETE SET NULL
);

-- Location Logs Table (Breadcrumb trail)
CREATE TABLE IF NOT EXISTS location_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    rider_id VARCHAR(50) NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (request_id) REFERENCES delivery_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Status Logs Table (Audit trail)
CREATE TABLE IF NOT EXISTS status_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    rider_id VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    remark TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (request_id) REFERENCES delivery_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert Mock Data
INSERT IGNORE INTO users (id, email, name, role, department, password_hash) VALUES
('admin_001', 'admin@company.com', 'Sarah Admin', 'admin', NULL, 'password'),
('personnel_001', 'john.hr@company.com', 'John Smith', 'personnel', 'Human Resources', 'password'),
('personnel_002', 'jane.finance@company.com', 'Jane Doe', 'personnel', 'Finance', 'password'),
('rider_001', 'rider1@company.com', 'Mike Rider', 'rider', NULL, 'password'),
('rider_002', 'rider2@company.com', 'Anna Transport', 'rider', NULL, 'password');
