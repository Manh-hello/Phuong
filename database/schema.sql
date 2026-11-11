-- Vòng quay quỹ phường anh em - MySQL 8.0+
CREATE DATABASE IF NOT EXISTS fund_wheel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fund_wheel;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500) NULL,
  joined_date DATE NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_status (status),
  INDEX idx_users_name (full_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rounds (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  round_number INT UNSIGNED NOT NULL,
  status ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress',
  total_slots INT UNSIGNED NOT NULL,
  contribution_amount DECIMAL(15,0) NOT NULL DEFAULT 0,   -- tiền đóng/người/tháng (snapshot lúc tạo vòng)
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  -- Chỉ cho phép đúng 1 vòng "in_progress" tại một thời điểm
  active_flag TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'in_progress' THEN 1 ELSE NULL END) STORED,
  UNIQUE KEY uq_round_number (round_number),
  UNIQUE KEY uq_one_active_round (active_flag)
) ENGINE=InnoDB;

-- Danh sách thành viên tham gia từng vòng (snapshot lúc bắt đầu vòng)
CREATE TABLE IF NOT EXISTS round_members (
  round_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (round_id, user_id),
  INDEX idx_rm_user (user_id),
  CONSTRAINT fk_rm_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE RESTRICT,
  CONSTRAINT fk_rm_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS draw_results (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  round_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  order_no INT UNSIGNED NOT NULL,                          -- thứ tự nhận trong vòng
  status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  amount DECIMAL(15,0) NOT NULL DEFAULT 0,
  drawn_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  received_month TINYINT UNSIGNED NULL,
  received_year SMALLINT UNSIGNED NULL,
  -- Ràng buộc chống trùng: 1 thành viên chỉ có tối đa 1 kết quả (pending/confirmed) trong 1 vòng
  active_user_key INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status IN ('pending','confirmed') THEN user_id ELSE NULL END) STORED,
  -- Mỗi vòng chỉ có tối đa 1 kết quả đang chờ xác nhận
  pending_key TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'pending' THEN 1 ELSE NULL END) STORED,
  UNIQUE KEY uq_round_user_active (round_id, active_user_key),
  UNIQUE KEY uq_round_pending (round_id, pending_key),
  INDEX idx_dr_user (user_id),
  INDEX idx_dr_status (status),
  INDEX idx_dr_drawn (drawn_at),
  INDEX idx_dr_month_year (received_year, received_month),
  CONSTRAINT fk_dr_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dr_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
  ('monthly_contribution', '500000'),
  ('group_size', '7');
