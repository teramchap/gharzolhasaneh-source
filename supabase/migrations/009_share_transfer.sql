-- Per-installment payer override, for "انتقال باقیمانده" (remaining months
-- transferred to someone else while past months keep their original payer).
alter table installments add column if not exists payer_user_id uuid references users(id);

-- Winner payouts now record who actually gets paid and how much, since a
-- split/transferred share can produce more than one payee per code.
alter table winners add column if not exists payer_user_id uuid references users(id);
alter table winners add column if not exists payout_amount numeric;
