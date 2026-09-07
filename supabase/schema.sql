-- Gharzolhasaneh platform — initial schema sketch
-- This mirrors auth.users (Supabase phone-auth) with a public profile row.
-- NOT yet applied to a live project — review before running.

create type user_role as enum ('admin', 'member');
create type fund_status as enum ('active', 'completed');
create type receipt_status as enum ('pending_review', 'pending_transfer', 'confirmed', 'rejected');
create type winner_status as enum (
  'awaiting_guarantee_type',
  'awaiting_documents',
  'awaiting_document_approval',
  'awaiting_account_info',
  'awaiting_deposit',
  'awaiting_deposit_confirmation',
  'completed'
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  mobile text unique not null,
  rubika_number text,
  role user_role not null default 'member',
  note text, -- visible only to the admin who wrote it
  created_at timestamptz not null default now()
);

create table funds ( -- صندوق
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_amount numeric not null,
  share_count int not null, -- تعداد کد
  installment_amount numeric generated always as (total_amount / nullif(share_count, 0)) stored,
  start_month_jalali text, -- e.g. '1404-02' — set later when months are generated
  duration_months int, -- set later
  status fund_status not null default 'active',
  created_at timestamptz not null default now()
);

create table fund_codes ( -- هر کد یک صندوق
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references funds(id) on delete cascade,
  code_number int not null,
  unique (fund_id, code_number)
);

create table fund_months ( -- ماه‌های تولید شده برای هر صندوق
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references funds(id) on delete cascade,
  jalali_month text not null, -- '1404-02'
  sequence int not null,
  winner_code_id uuid references fund_codes(id),
  draw_date_jalali text,
  is_completed boolean not null default false,
  unique (fund_id, jalali_month)
);

create table shares ( -- سهم هر عضو در یک کد
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references fund_codes(id) on delete cascade,
  user_id uuid not null references users(id),
  amount numeric not null,
  withdrawn boolean not null default false,
  transferred_to_user_id uuid references users(id), -- انصراف با انتقال کامل
  created_at timestamptz not null default now()
);

create table installments ( -- قسط هر سهم برای هر ماه صندوق
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references shares(id) on delete cascade,
  fund_month_id uuid not null references fund_months(id) on delete cascade,
  due_amount numeric not null,
  paid_amount numeric not null default 0,
  is_partial boolean not null default false,
  status receipt_status,
  paid_on_jalali text,
  goodwill_score int, -- +1/روز زودتر، -1/روز دیرتر نسبت به پانزدهم
  unique (share_id, fund_month_id)
);

create table receipts ( -- فیش واریزی
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  total_amount numeric not null,
  has_image boolean not null default true,
  card_last4 text,
  deposit_date_jalali text,
  status receipt_status not null default 'pending_review',
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table receipt_images (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  storage_path text not null
);

create table receipt_installments ( -- کدام اقساط را این فیش پوشش می‌دهد
  receipt_id uuid not null references receipts(id) on delete cascade,
  installment_id uuid not null references installments(id) on delete cascade,
  amount_applied numeric not null,
  primary key (receipt_id, installment_id)
);

create table winners (
  id uuid primary key default gen_random_uuid(),
  fund_month_id uuid not null references fund_months(id) on delete cascade,
  share_id uuid not null references shares(id),
  status winner_status not null default 'awaiting_guarantee_type',
  guarantee_type text[], -- subset of {'check','promissory_note'} or empty
  guarantee_documents text[], -- storage paths
  sheba_number text,
  bank_name text,
  account_holder_name text,
  payout_receipt_path text,
  member_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  action_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table users enable row level security;

-- Every signed-in user can read their own profile row (needed right after login).
create policy "users can view own profile"
  on users for select
  using (auth.uid() = id);

-- Broader admin policies (view/manage all funds, users, receipts, etc.)
-- will be added once the admin-side features are built, using a
-- security-definer function to check role without recursive RLS lookups.
