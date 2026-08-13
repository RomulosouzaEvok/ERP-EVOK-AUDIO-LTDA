PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id   INTEGER NOT NULL,
  cnpj         TEXT NOT NULL,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  credit_limit REAL NOT NULL DEFAULT 0,
  approved_by  TEXT,
  approved_at  TEXT,
  created_at   TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies (id)
);

CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id  INTEGER NOT NULL,
  company_id   INTEGER NOT NULL,
  amount       REAL NOT NULL,
  status       TEXT NOT NULL DEFAULT 'created',
  external_ref TEXT,
  created_by   TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  sent_at      TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
  FOREIGN KEY (company_id) REFERENCES companies (id)
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id   INTEGER NOT NULL,
  external_ref TEXT,
  result       TEXT NOT NULL,
  attempted_at TEXT NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES payments (id)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers (company_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments (supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment ON payment_attempts (payment_id);
