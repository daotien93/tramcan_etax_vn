-- TramCan E-Tax / HKD accounting — PostgreSQL reference schema
-- Nguồn chính cho migrate: `api/prisma/schema.prisma` → `cd api && npx prisma migrate dev`
-- File này hữu ích khi review SQL thuần hoặc áp dụng tay lên DB có sẵn.
-- Supabase: có thể thay bảng `users` bằng `profiles (id UUID PRIMARY KEY REFERENCES auth.users(id) ...)`
-- và bỏ email/password nếu chỉ dùng Supabase Auth.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('owner', 'accountant');

CREATE TYPE transaction_type AS ENUM ('income', 'expense');

CREATE TYPE transaction_category AS ENUM ('service', 'trading', 'other');

CREATE TYPE payment_method AS ENUM ('bank', 'cash');

CREATE TYPE document_type AS ENUM ('contract', 'invoice', 'receipt');

CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'cancelled');

-- JWT / app users (plain Postgres). Supabase: id = auth.users.id, không cần password_hash.
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MODULE 1: Hồ sơ pháp lý
CREATE TABLE business_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  owner_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  tax_code TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  cccd_number TEXT,
  license_file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_business_profile_owner ON business_profile (owner_user_id);

-- MODULE 2: Tài khoản ngân hàng
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  business_profile_id UUID NOT NULL REFERENCES business_profile (id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_accounts_business ON bank_accounts (business_profile_id);

CREATE UNIQUE INDEX uq_bank_accounts_primary
  ON bank_accounts (business_profile_id)
  WHERE is_primary = true;

-- MODULE 3: Giao dịch
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  business_profile_id UUID NOT NULL REFERENCES business_profile (id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  category transaction_category NOT NULL DEFAULT 'other',
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL,
  bank_account_id UUID REFERENCES bank_accounts (id) ON DELETE SET NULL,
  customer_name TEXT,
  description TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_bank_when_bank_payment CHECK (
    (payment_method = 'bank' AND bank_account_id IS NOT NULL)
    OR (payment_method = 'cash' AND bank_account_id IS NULL)
  )
);

CREATE INDEX idx_transactions_business_date ON transactions (business_profile_id, transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions (business_profile_id, type);
CREATE INDEX idx_transactions_category ON transactions (business_profile_id, category);

-- MODULE 4: Chứng từ
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
  doc_type document_type NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_transaction ON documents (transaction_id);

-- MODULE 5: Hóa đơn (lite)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  issued_date DATE,
  status invoice_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_transaction ON invoices (transaction_id);

-- MODULE 8: Hỗ trợ rule "Income != bank inflow" (khi import sao kê)
CREATE TABLE bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts (id) ON DELETE CASCADE,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  description TEXT,
  posted_at DATE NOT NULL,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_stmt_account_date ON bank_statement_lines (bank_account_id, posted_at DESC);
