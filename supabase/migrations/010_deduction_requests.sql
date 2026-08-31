alter table installments add column if not exists deduction_requested boolean not null default false;
alter table installments add column if not exists deducted boolean not null default false;
alter table installments add column if not exists deduction_rejection_reason text;
