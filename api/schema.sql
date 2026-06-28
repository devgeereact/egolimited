-- EGO LIMITED — schema (M1 auth + M2 customers + M3 jobs). MySQL, ego_ prefixed
-- (shared DB). Run via: php seed.php  (idempotent; CREATE IF NOT EXISTS).
-- Mirrors docs/03-DATA-MODEL.md (Postgres) adapted to MySQL. Soft-delete via deleted_at.

CREATE TABLE IF NOT EXISTS ego_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NULL,
  role          ENUM('admin','engineer') NOT NULL DEFAULT 'engineer',
  active        TINYINT(1)    NOT NULL DEFAULT 1,
  invite_token  VARCHAR(64)   NULL,
  phone         VARCHAR(40)   NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    DATETIME      NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_sessions (
  token      VARCHAR(64) PRIMARY KEY,
  user_id    INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ego_sessions_user FOREIGN KEY (user_id) REFERENCES ego_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M2: customers + addresses
CREATE TABLE IF NOT EXISTS ego_customers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  phone      VARCHAR(40)  NULL,
  email      VARCHAR(190) NULL,
  notes      TEXT         NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_addresses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  line1       VARCHAR(190) NULL,
  line2       VARCHAR(190) NULL,
  city        VARCHAR(120) NULL,
  postcode    VARCHAR(20)  NULL,
  is_primary  TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_ego_addr_customer FOREIGN KEY (customer_id) REFERENCES ego_customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M3: company settings (single row), jobs, activity log
CREATE TABLE IF NOT EXISTS ego_company_settings (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  company_name        VARCHAR(160) NOT NULL DEFAULT 'EGO LIMITED',
  address             VARCHAR(255) NULL,
  phone               VARCHAR(40)  NULL,
  email               VARCHAR(190) NULL,
  vat_number          VARCHAR(40)  NULL,
  default_vat_rate    DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  logo_url            VARCHAR(255) NULL,
  bank_account_name   VARCHAR(160) NULL,
  bank_sort_code      VARCHAR(12)  NULL,
  bank_account_number VARCHAR(20)  NULL,
  invoice_prefix      VARCHAR(12)  NOT NULL DEFAULT 'INV-',
  invoice_next_number INT          NOT NULL DEFAULT 1,
  job_prefix          VARCHAR(12)  NOT NULL DEFAULT 'JOB-',
  job_next_number     INT          NOT NULL DEFAULT 1,
  payment_terms_days  INT          NOT NULL DEFAULT 14
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_jobs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  reference       VARCHAR(24) NOT NULL UNIQUE,
  customer_id     INT NOT NULL,
  address_id      INT NULL,
  engineer_id     INT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT NULL,
  priority        ENUM('low','normal','urgent') NOT NULL DEFAULT 'normal',
  status          ENUM('new','scheduled','en_route','on_site','on_hold','completed','invoiced','paid','closed','cancelled') NOT NULL DEFAULT 'new',
  quoted_amount   DECIMAL(10,2) NULL,
  scheduled_start DATETIME NULL,
  scheduled_end   DATETIME NULL,
  signoff_name    VARCHAR(160) NULL,
  signoff_signature TEXT NULL,
  completed_at    DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  CONSTRAINT fk_ego_jobs_customer FOREIGN KEY (customer_id) REFERENCES ego_customers(id),
  CONSTRAINT fk_ego_jobs_address  FOREIGN KEY (address_id)  REFERENCES ego_addresses(id),
  CONSTRAINT fk_ego_jobs_engineer FOREIGN KEY (engineer_id) REFERENCES ego_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_activity_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  job_id     INT NULL,
  invoice_id INT NULL,
  actor_id   INT NULL,
  action     VARCHAR(60) NOT NULL,
  detail     JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ego_activity_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M5: engineer field data
CREATE TABLE IF NOT EXISTS ego_job_photos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  job_id      INT NOT NULL,
  url         VARCHAR(255) NOT NULL,
  caption     VARCHAR(200) NULL,
  uploaded_by INT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ego_photos_job (job_id),
  CONSTRAINT fk_ego_photos_job FOREIGN KEY (job_id) REFERENCES ego_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_job_notes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  job_id     INT NOT NULL,
  author_id  INT NULL,
  body       TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ego_notes_job (job_id),
  CONSTRAINT fk_ego_notes_job FOREIGN KEY (job_id) REFERENCES ego_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M6/M7: quotes + invoices (one table, kind = quote|invoice) + lines + payments
ALTER TABLE ego_company_settings ADD COLUMN IF NOT EXISTS quote_prefix VARCHAR(12) NOT NULL DEFAULT 'QUO-';
ALTER TABLE ego_company_settings ADD COLUMN IF NOT EXISTS quote_next_number INT NOT NULL DEFAULT 1;

-- Reference rework: 6-char customer code (from name+phone+postcode); job/quote/invoice = CODE-J#/Q#/I#
ALTER TABLE ego_customers ADD COLUMN IF NOT EXISTS ref_code VARCHAR(12) NULL UNIQUE;

-- Engineer: on-hold reason + parts/order needed
ALTER TABLE ego_jobs ADD COLUMN IF NOT EXISTS hold_reason VARCHAR(255) NULL;
ALTER TABLE ego_jobs ADD COLUMN IF NOT EXISTS parts_required TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE ego_jobs ADD COLUMN IF NOT EXISTS parts_note VARCHAR(255) NULL;

-- M12 notifications: alert the office when a job is completed
ALTER TABLE ego_company_settings ADD COLUMN IF NOT EXISTS notify_on_complete TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE ego_company_settings ADD COLUMN IF NOT EXISTS notify_email VARCHAR(190) NULL;

CREATE TABLE IF NOT EXISTS ego_invoices (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  kind              ENUM('quote','invoice') NOT NULL DEFAULT 'invoice',
  number            VARCHAR(24) NULL UNIQUE,      -- allocated on send (no gaps)
  job_id            INT NOT NULL,
  customer_id       INT NOT NULL,
  payment_reference VARCHAR(24) NOT NULL,         -- the JOB reference (threads everything)
  status            ENUM('draft','sent','accepted','declined','overdue','paid','void') NOT NULL DEFAULT 'draft',
  issue_date        DATE NULL,
  due_date          DATE NULL,
  subtotal          DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_rate          DECIMAL(5,2)  NOT NULL DEFAULT 0,
  vat_amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total             DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes             TEXT NULL,
  sent_at           DATETIME NULL,
  paid_at           DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME NULL,
  INDEX idx_ego_inv_job (job_id),
  CONSTRAINT fk_ego_inv_job      FOREIGN KEY (job_id)      REFERENCES ego_jobs(id),
  CONSTRAINT fk_ego_inv_customer FOREIGN KEY (customer_id) REFERENCES ego_customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_invoice_lines (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id  INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  line_total  DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort        INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_ego_lines_invoice FOREIGN KEY (invoice_id) REFERENCES ego_invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M12: throttle invoice reminders
ALTER TABLE ego_invoices ADD COLUMN IF NOT EXISTS reminded_at DATETIME NULL;

-- Messages: acknowledge + engineer visibility + html body (for existing tables)
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS acknowledged TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS visible_to_engineer TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS body_html MEDIUMTEXT NULL;

-- Task board (kanban)
CREATE TABLE IF NOT EXISTS ego_tasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT NULL,
  status      VARCHAR(24) NOT NULL DEFAULT 'backlog',
  accent      VARCHAR(16) NULL,
  sort        INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M13: recurring / maintenance job plans (templates + repeat rules)
CREATE TABLE IF NOT EXISTS ego_recurring_plans (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  customer_id    INT NOT NULL,
  title          VARCHAR(200) NOT NULL,
  description    TEXT NULL,
  priority       ENUM('low','normal','urgent') NOT NULL DEFAULT 'normal',
  quoted_amount  DECIMAL(10,2) NULL,
  interval_unit  ENUM('day','week','month') NOT NULL DEFAULT 'month',
  interval_count INT NOT NULL DEFAULT 1,
  next_due       DATE NOT NULL,
  active         TINYINT(1) NOT NULL DEFAULT 1,
  last_generated DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ego_rec_customer FOREIGN KEY (customer_id) REFERENCES ego_customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M11: customer portal access tokens (one unguessable link per job)
CREATE TABLE IF NOT EXISTS ego_customer_access (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  job_id     INT NOT NULL,
  token      VARCHAR(64) NOT NULL UNIQUE,
  short_code VARCHAR(12) NOT NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ego_access_job (job_id),
  CONSTRAINT fk_ego_access_job FOREIGN KEY (job_id) REFERENCES ego_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Phase 2 (M9/M15): email messages (inbound via IMAP + outbound via SMTP)
CREATE TABLE IF NOT EXISTS ego_messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NULL,
  job_id      INT NULL,
  direction   ENUM('inbound','outbound') NOT NULL,
  channel     VARCHAR(16) NOT NULL DEFAULT 'email',
  from_email  VARCHAR(190) NULL,
  from_name   VARCHAR(160) NULL,
  to_email    VARCHAR(190) NULL,
  subject     VARCHAR(255) NULL,
  body        MEDIUMTEXT NULL,
  uid         VARCHAR(255) NULL,            -- IMAP message-id, for dedupe
  status      VARCHAR(16) NOT NULL DEFAULT 'received',
  acknowledged TINYINT(1) NOT NULL DEFAULT 0,
  visible_to_engineer TINYINT(1) NOT NULL DEFAULT 0,
  body_html   MEDIUMTEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ego_msg_uid (uid),
  INDEX idx_ego_msg_cust (customer_id),
  INDEX idx_ego_msg_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Phase 2: integration secrets (SMTP, OpenWeather, OpenRouter, IMAP).
-- Values live ONLY here in MySQL — never in the repo, never committed/pushed.
CREATE TABLE IF NOT EXISTS ego_integrations (
  k          VARCHAR(60) PRIMARY KEY,
  v          TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_payments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id  INT NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  paid_on     DATE NOT NULL,
  reference   VARCHAR(120) NULL,
  note        VARCHAR(255) NULL,
  recorded_by INT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ego_pay_invoice FOREIGN KEY (invoice_id) REFERENCES ego_invoices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- Roles & permissions (Founder > Manager > Office (Employee Admin) > Engineer)
-- Customers have no login (tokenised job link). Migrate legacy 'admin' -> 'founder'.
-- ============================================================================
ALTER TABLE ego_users MODIFY role ENUM('founder','manager','office','engineer','admin') NOT NULL DEFAULT 'engineer';
UPDATE ego_users SET role='founder' WHERE role='admin';
ALTER TABLE ego_users MODIFY role ENUM('founder','manager','office','engineer') NOT NULL DEFAULT 'engineer';

-- Engineer availability (field app toggle; office sees it on Team + schedule).
ALTER TABLE ego_users ADD COLUMN IF NOT EXISTS available TINYINT NOT NULL DEFAULT 1;
-- Top-nav notifications: when this user last opened the bell (badge = newer than this).
ALTER TABLE ego_users ADD COLUMN IF NOT EXISTS notifications_seen_at DATETIME NULL;

-- Office → engineer job brief (what needs doing, optionally AI-drafted) + on-site checklist.
ALTER TABLE ego_jobs ADD COLUMN IF NOT EXISTS summary VARCHAR(255) NULL;
ALTER TABLE ego_jobs ADD COLUMN IF NOT EXISTS engineer_brief TEXT NULL;
CREATE TABLE IF NOT EXISTS ego_job_checklist (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  job_id     INT NOT NULL,
  label      VARCHAR(255) NOT NULL,
  done       TINYINT NOT NULL DEFAULT 0,
  done_at    DATETIME NULL,
  done_by    INT NULL,
  sort       INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Task board: who a card is assigned to (workers assign to each other; colour = assignee)
ALTER TABLE ego_tasks ADD COLUMN IF NOT EXISTS assignee_id INT NULL;

-- Customer reviews: stored as a message with a star rating + channel='review'
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS rating TINYINT NULL;
