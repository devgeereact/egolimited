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
  default_vat_rate    DECIMAL(5,2) NOT NULL DEFAULT 0,
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
  en_route_at     DATETIME NULL,   -- stamped when engineer starts travelling
  on_site_at      DATETIME NULL,   -- stamped on arrival
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

-- (The ego_messages ALTERs that used to sit here have moved BELOW the table's CREATE — see the
--  note there. Running them before the table existed made this file unable to build a fresh DB.)

-- Task board (kanban)
CREATE TABLE IF NOT EXISTS ego_tasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT NULL,
  status      VARCHAR(24) NOT NULL DEFAULT 'backlog',
  accent      VARCHAR(16) NULL,
  sort        INT NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,   -- set when card enters 'done'; basis for the 3-day auto-archive
  archived_at  DATETIME NULL,   -- set once a done card ages out; hidden from the board by default
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

-- Backfill for databases created before these columns existed. They are already in the CREATE
-- above, so this is a no-op on a fresh build. These ALTERs previously sat ~45 lines EARLIER in
-- this file, i.e. before ego_messages was created — which made schema.sql unable to build a
-- database from scratch at all ("Table 'ego_messages' doesn't exist"). Nobody noticed because
-- the live DB already had the tables. Keep migrations AFTER the CREATE they depend on.
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS acknowledged TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS visible_to_engineer TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS body_html MEDIUMTEXT NULL;

-- Phase 2: integration secrets (SMTP, OpenWeather, OpenRouter, IMAP).
-- Values live ONLY here in MySQL — never in the repo, never committed/pushed.
CREATE TABLE IF NOT EXISTS ego_integrations (
  k          VARCHAR(60) PRIMARY KEY,
  v          TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Financial ledger. Rows are NEVER hard-deleted — a mis-keyed payment is soft-reversed
-- (deleted_at/deleted_by) so the trail of the mistake AND its correction survives the
-- 6-year HMRC retention window. EVERY read must filter `deleted_at IS NULL`.
CREATE TABLE IF NOT EXISTS ego_payments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id  INT NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  paid_on     DATE NOT NULL,
  reference   VARCHAR(120) NULL,
  note        VARCHAR(255) NULL,
  recorded_by INT NULL,
  deleted_at  DATETIME NULL,
  deleted_by  INT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ego_pay_invoice (invoice_id, deleted_at),
  INDEX idx_ego_pay_paid_on (paid_on),
  CONSTRAINT fk_ego_pay_invoice FOREIGN KEY (invoice_id) REFERENCES ego_invoices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Existing databases (pre 2026-07-12): add the ledger's soft-delete columns in place.
ALTER TABLE ego_payments ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
ALTER TABLE ego_payments ADD COLUMN IF NOT EXISTS deleted_by INT NULL;

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

-- Invoicing: link an auto-created invoice back to the quote it was converted from
ALTER TABLE ego_invoices ADD COLUMN IF NOT EXISTS converted_from_quote_id INT NULL;

-- Performance: indexes on hot filter/sort columns (list + dashboard queries were full-scanning)
ALTER TABLE ego_jobs      ADD INDEX IF NOT EXISTS idx_ego_jobs_status_sched (status, scheduled_start);
ALTER TABLE ego_jobs      ADD INDEX IF NOT EXISTS idx_ego_jobs_customer (customer_id);
ALTER TABLE ego_invoices  ADD INDEX IF NOT EXISTS idx_ego_inv_status_due (status, due_date);
ALTER TABLE ego_customers ADD INDEX IF NOT EXISTS idx_ego_cust_deleted (deleted_at);
ALTER TABLE ego_messages  ADD INDEX IF NOT EXISTS idx_ego_msg_created (created_at);
ALTER TABLE ego_sessions  ADD INDEX IF NOT EXISTS idx_ego_sess_expires (expires_at);

-- Jobs: per-stage timestamps for the lifecycle timeline + SLA visibility
ALTER TABLE ego_jobs ADD COLUMN IF NOT EXISTS en_route_at DATETIME NULL;
ALTER TABLE ego_jobs ADD COLUMN IF NOT EXISTS on_site_at DATETIME NULL;

-- Task board: who a card is assigned to (workers assign to each other; colour = assignee)
ALTER TABLE ego_tasks ADD COLUMN IF NOT EXISTS assignee_id INT NULL;
-- Task board: done-timestamp + archive (auto-archive done cards after 3 days; hidden from board)
ALTER TABLE ego_tasks ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL;
ALTER TABLE ego_tasks ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL;

-- Customer reviews: stored as a message with a star rating + channel='review'
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS rating TINYINT NULL;

-- Email attachments (inbound captured on IMAP sync, outbound kept on send). Files live
-- OUTSIDE the web root (~/ego_private/mail_attach) and are served only via signed URLs.
CREATE TABLE IF NOT EXISTS ego_message_attachments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL,
  filename   VARCHAR(255) NOT NULL,
  mime       VARCHAR(160) NOT NULL DEFAULT 'application/octet-stream',
  size       INT NOT NULL DEFAULT 0,
  storage    VARCHAR(255) NOT NULL,   -- random on-disk name
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- PROCUREMENT (M-B): suppliers + subcontractors. ego_-prefixed, soft-delete.
-- ============================================================================
-- DEPRECATED (module removed 2026-07-13): the Procurement module was dropped —
-- engineers buy parts from a merchant and hand in a receipt, nobody raises
-- purchase orders or tracks stock. Table retained (not dropped): purchase
-- records may carry a 6-year accounting retention duty, and dropping tables
-- is irreversible while removing the code is not.
CREATE TABLE IF NOT EXISTS ego_suppliers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(190) NOT NULL,
  contact     VARCHAR(190) NULL,
  phone       VARCHAR(60)  NULL,
  email       VARCHAR(190) NULL,
  account_ref VARCHAR(120) NULL,
  category    VARCHAR(80)  NULL,
  address     VARCHAR(255) NULL,
  notes       TEXT NULL,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  INDEX idx_ego_supp_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_subcontractors (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(190) NOT NULL,
  company         VARCHAR(190) NULL,
  trades          VARCHAR(255) NULL,
  coverage_areas  VARCHAR(255) NULL,
  phone           VARCHAR(40)  NULL,
  email           VARCHAR(190) NULL,
  insurance_expiry DATE NULL,
  qualifications  VARCHAR(255) NULL,
  day_rate        DECIMAL(10,2) NULL,
  rating          TINYINT NULL,
  status          ENUM('active','pending','suspended') NOT NULL DEFAULT 'active',
  notes           TEXT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  INDEX idx_ego_subc_status (status),
  INDEX idx_ego_subc_ins (insurance_expiry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PROCUREMENT (M-B slice 2): parts catalogue + pricebook (cost/sale) + stock level.
-- DEPRECATED (module removed 2026-07-13): the Procurement module was dropped —
-- engineers buy parts from a merchant and hand in a receipt, nobody raises
-- purchase orders or tracks stock. Table retained (not dropped): purchase
-- records may carry a 6-year accounting retention duty, and dropping tables
-- is irreversible while removing the code is not.
CREATE TABLE IF NOT EXISTS ego_parts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  sku           VARCHAR(60)  NULL,
  name          VARCHAR(190) NOT NULL,
  description   TEXT NULL,
  category      VARCHAR(80)  NULL,
  supplier_id   INT NULL,
  unit          VARCHAR(24) NOT NULL DEFAULT 'each',
  cost_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_qty     DECIMAL(10,2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  INDEX idx_ego_parts_name (name),
  INDEX idx_ego_parts_supplier (supplier_id),
  CONSTRAINT fk_ego_parts_supplier FOREIGN KEY (supplier_id) REFERENCES ego_suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PROCUREMENT (M-B slice 3): stock movements ledger + purchase orders (header + items).
-- DEPRECATED (module removed 2026-07-13): the Procurement module was dropped —
-- engineers buy parts from a merchant and hand in a receipt, nobody raises
-- purchase orders or tracks stock. Table retained (not dropped): purchase
-- records may carry a 6-year accounting retention duty, and dropping tables
-- is irreversible while removing the code is not.
CREATE TABLE IF NOT EXISTS ego_stock_movements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  part_id    INT NOT NULL,
  qty_delta  DECIMAL(10,2) NOT NULL,
  reason     VARCHAR(40) NOT NULL DEFAULT 'adjustment',
  reference  VARCHAR(60) NULL,
  note       VARCHAR(255) NULL,
  actor_id   INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ego_stock_part (part_id),
  CONSTRAINT fk_ego_stock_part FOREIGN KEY (part_id) REFERENCES ego_parts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DEPRECATED (module removed 2026-07-13): the Procurement module was dropped —
-- engineers buy parts from a merchant and hand in a receipt, nobody raises
-- purchase orders or tracks stock. Table retained (not dropped): purchase
-- records may carry a 6-year accounting retention duty, and dropping tables
-- is irreversible while removing the code is not.
CREATE TABLE IF NOT EXISTS ego_purchase_orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  reference     VARCHAR(24) NULL UNIQUE,
  supplier_id   INT NOT NULL,
  status        ENUM('draft','ordered','received','cancelled') NOT NULL DEFAULT 'draft',
  order_date    DATE NULL,
  expected_date DATE NULL,
  received_date DATE NULL,
  notes         TEXT NULL,
  subtotal      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  INDEX idx_ego_po_supplier (supplier_id),
  INDEX idx_ego_po_status (status),
  CONSTRAINT fk_ego_po_supplier FOREIGN KEY (supplier_id) REFERENCES ego_suppliers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DEPRECATED (module removed 2026-07-13): the Procurement module was dropped —
-- engineers buy parts from a merchant and hand in a receipt, nobody raises
-- purchase orders or tracks stock. Table retained (not dropped): purchase
-- records may carry a 6-year accounting retention duty, and dropping tables
-- is irreversible while removing the code is not.
CREATE TABLE IF NOT EXISTS ego_po_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  po_id       INT NOT NULL,
  part_id     INT NULL,
  description VARCHAR(255) NOT NULL,
  qty         DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_cost   DECIMAL(10,2) NOT NULL DEFAULT 0,
  line_total  DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort        INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_ego_poitem_po FOREIGN KEY (po_id) REFERENCES ego_purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_ego_poitem_part FOREIGN KEY (part_id) REFERENCES ego_parts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- ASSET MANAGEMENT (M-C): asset register + service history per asset.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ego_assets (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(190) NOT NULL,
  asset_tag         VARCHAR(60) NULL,
  customer_id       INT NULL,
  location          VARCHAR(190) NULL,
  type              VARCHAR(120) NULL,
  make              VARCHAR(120) NULL,
  model             VARCHAR(120) NULL,
  serial            VARCHAR(120) NULL,
  status            ENUM('ok','due','fault','retired') NOT NULL DEFAULT 'ok',
  install_date      DATE NULL,
  next_service_date DATE NULL,
  notes             TEXT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME NULL,
  INDEX idx_ego_asset_status (status),
  INDEX idx_ego_asset_next (next_service_date),
  INDEX idx_ego_asset_customer (customer_id),
  CONSTRAINT fk_ego_asset_customer FOREIGN KEY (customer_id) REFERENCES ego_customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_asset_services (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  asset_id     INT NOT NULL,
  job_id       INT NULL,
  service_date DATE NOT NULL,
  engineer_id  INT NULL,
  outcome      ENUM('ok','repaired','fault') NOT NULL DEFAULT 'ok',
  notes        VARCHAR(255) NULL,
  next_due     DATE NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ego_asvc_asset (asset_id),
  CONSTRAINT fk_ego_asvc_asset FOREIGN KEY (asset_id) REFERENCES ego_assets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ego_asvc_job FOREIGN KEY (job_id) REFERENCES ego_jobs(id) ON DELETE SET NULL,
  CONSTRAINT fk_ego_asvc_eng FOREIGN KEY (engineer_id) REFERENCES ego_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- PLATFORM (M-A): announcements (role-audience broadcast).
-- ============================================================================
CREATE TABLE IF NOT EXISTS ego_announcements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(190) NOT NULL,
  body       TEXT NULL,
  audience   ENUM('all','engineers','office') NOT NULL DEFAULT 'all',
  pinned     TINYINT(1) NOT NULL DEFAULT 0,
  active     TINYINT(1) NOT NULL DEFAULT 1,
  author_id  INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_ego_ann_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- CONTRACTS / PPM (M-D): maintenance contracts + resource allocations + billing/SLA cadence.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ego_contracts (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  reference          VARCHAR(24) NULL UNIQUE,
  customer_id        INT NULL,
  title              VARCHAR(190) NOT NULL,
  value              DECIMAL(10,2) NOT NULL DEFAULT 0,
  status             ENUM('active','pending','expired','cancelled') NOT NULL DEFAULT 'active',
  start_date         DATE NULL,
  renewal_date       DATE NULL,
  sla_response_hours INT NULL,
  sla_fix_hours      INT NULL,
  ppm_every_days     INT NULL,
  next_service       DATE NULL,
  last_service       DATE NULL,
  bill_every_days    INT NULL,
  next_bill_date     DATE NULL,
  last_billed        DATE NULL,
  bill_amount        DECIMAL(10,2) NULL,
  notes              TEXT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at         DATETIME NULL,
  INDEX idx_ego_ct_status (status),
  INDEX idx_ego_ct_renewal (renewal_date),
  INDEX idx_ego_ct_nextbill (next_bill_date),
  INDEX idx_ego_ct_customer (customer_id),
  CONSTRAINT fk_ego_ct_customer FOREIGN KEY (customer_id) REFERENCES ego_customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_contract_allocations (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  contract_id    INT NOT NULL,
  kind           ENUM('employee','subcontractor') NOT NULL DEFAULT 'employee',
  person_name    VARCHAR(190) NOT NULL,
  role           VARCHAR(120) NULL,
  hours_per_week DECIMAL(6,2) NULL,
  rate           DECIMAL(10,2) NULL,
  notes          VARCHAR(255) NULL,
  sort           INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_ego_ctalloc_ct FOREIGN KEY (contract_id) REFERENCES ego_contracts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- COMPLIANCE SUITE (M-E): RAMS documents, incidents, certificates.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ego_rams_documents (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(190) NOT NULL,
  trade       VARCHAR(80) NULL,
  reference   VARCHAR(80) NULL,
  review_date DATE NULL,
  content     TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  INDEX idx_ego_rams_review (review_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_incidents (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  incident_date DATE NULL,
  type          ENUM('accident','near_miss','injury','property','environmental','other') NOT NULL DEFAULT 'near_miss',
  severity      ENUM('low','medium','high','riddor') NOT NULL DEFAULT 'low',
  location      VARCHAR(190) NULL,
  person        VARCHAR(190) NULL,
  description   TEXT NULL,
  action_taken  TEXT NULL,
  reported_by   VARCHAR(120) NULL,
  status        ENUM('open','investigating','closed') NOT NULL DEFAULT 'open',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  INDEX idx_ego_inc_status (status),
  INDEX idx_ego_inc_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ego_certificates (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(190) NOT NULL,
  holder       VARCHAR(190) NULL,
  engineer_id  INT NULL,
  type         VARCHAR(120) NULL,
  reference    VARCHAR(120) NULL,
  status       ENUM('valid','expiring','expired') NOT NULL DEFAULT 'valid',
  issued_date  DATE NULL,
  expiry_date  DATE NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   DATETIME NULL,
  INDEX idx_ego_cert_expiry (expiry_date),
  CONSTRAINT fk_ego_cert_eng FOREIGN KEY (engineer_id) REFERENCES ego_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PLATFORM (M-A): account security + TOTP 2FA columns on users.
ALTER TABLE ego_users ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE ego_users ADD COLUMN IF NOT EXISTS password_changed_at DATETIME NULL;
ALTER TABLE ego_users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64) NULL;
ALTER TABLE ego_users ADD COLUMN IF NOT EXISTS totp_enabled TINYINT(1) NOT NULL DEFAULT 0;

-- Landing: Companies House number (VAT already exists). Shown on the public site.
ALTER TABLE ego_company_settings ADD COLUMN IF NOT EXISTS companies_house_no VARCHAR(20) NULL;

-- Reviews: source so app reviews + imported Google reviews live together (M: reviews hub).
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS source VARCHAR(16) NULL;

-- M17: LEAD PROSPECTING + AUTO-DRIP CAMPAIGNS
-- AI web-search finds candidate businesses; a human APPROVES before anything is queued to
-- send (never a blind scrape-and-blast — GDPR/PECR). campaign_cron.php then drips approved,
-- not-yet-emailed leads in small batches on a schedule (cPanel cron, every 1-2h).
CREATE TABLE IF NOT EXISTS ego_leads (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(190) NULL,
  company     VARCHAR(190) NULL,
  email       VARCHAR(190) NULL,
  website     VARCHAR(255) NULL,
  source_url  VARCHAR(500) NULL,
  note        VARCHAR(500) NULL,
  status      ENUM('found','approved','rejected','emailed') NOT NULL DEFAULT 'found',
  search_query VARCHAR(255) NULL,
  found_by    INT NULL,
  emailed_at  DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lead_email (email),
  INDEX idx_ego_lead_status (status),
  CONSTRAINT fk_ego_lead_found_by FOREIGN KEY (found_by) REFERENCES ego_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Single-row config for the unattended drip: what to send + how many per run. Disabled by
-- default — an office user must explicitly turn it on after reviewing the message.
CREATE TABLE IF NOT EXISTS ego_campaign_automation (
  id         INT PRIMARY KEY DEFAULT 1,
  enabled    TINYINT NOT NULL DEFAULT 0,
  subject    VARCHAR(255) NULL,
  body       MEDIUMTEXT NULL,
  image_url  VARCHAR(500) NULL,
  batch_size INT NOT NULL DEFAULT 25,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO ego_campaign_automation (id, enabled) VALUES (1, 0);

-- ============================================================================
-- Added 2026-07-12 (transformation review, Phase 1).
-- MUST stay at the END of this file: every index below depends on a column that
-- an earlier ALTER adds (e.g. ego_tasks.assignee_id), so ordering is load-bearing.
--
-- NOTE: `ADD INDEX IF NOT EXISTS` is MariaDB-only. Plain MySQL throws "Duplicate key
-- name", and under mysqli_report(STRICT) that is a thrown exception, not a warning —
-- so runtime self-heal helpers must query information_schema instead of relying on
-- this syntax (see ensure_payment_cols() in index.php).
-- ============================================================================

-- Close a schema drift: `archived`/`flagged` existed ONLY as a lazy self-heal inside
-- index.php (ensure_message_cols), never here — so a DB built from schema.sql alone was
-- missing them, and the index below would fail. schema.sql is the source of truth.
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS archived TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS flagged  TINYINT(1) NOT NULL DEFAULT 0;

-- Indexes backing queries that were filesorting or full-scanning.
-- GET /invoices does `ORDER BY i.created_at DESC` with no index on it → filesort every load.
ALTER TABLE ego_invoices        ADD INDEX IF NOT EXISTS idx_ego_inv_created (created_at);
ALTER TABLE ego_invoices        ADD INDEX IF NOT EXISTS idx_ego_inv_customer (customer_id);
-- The inbox filters by channel + archived; the kanban board filters by status. Neither indexed.
ALTER TABLE ego_messages        ADD INDEX IF NOT EXISTS idx_ego_msg_channel (channel, archived);
ALTER TABLE ego_tasks           ADD INDEX IF NOT EXISTS idx_ego_task_status (status);
ALTER TABLE ego_tasks           ADD INDEX IF NOT EXISTS idx_ego_task_assignee (assignee_id);
-- cron.php runs `WHERE active=1 AND next_due<=CURDATE()` on every tick → full scan.
ALTER TABLE ego_recurring_plans ADD INDEX IF NOT EXISTS idx_ego_recur_due (active, next_due);
-- Append-only audit log, queried by time and by actor; neither column was indexed.
ALTER TABLE ego_activity_log    ADD INDEX IF NOT EXISTS idx_ego_act_created (created_at);
ALTER TABLE ego_activity_log    ADD INDEX IF NOT EXISTS idx_ego_act_actor (actor_id);
-- ego_payments is a ledger: every read filters `deleted_at IS NULL`.
ALTER TABLE ego_payments        ADD INDEX IF NOT EXISTS idx_ego_pay_invoice (invoice_id, deleted_at);
ALTER TABLE ego_payments        ADD INDEX IF NOT EXISTS idx_ego_pay_paid_on (paid_on);
