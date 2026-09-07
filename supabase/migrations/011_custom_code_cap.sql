-- Lets an individual code's cap differ from the fund's standard
-- installment_amount (e.g. one code split 4M/6M instead of the usual 5M).
alter table fund_codes add column if not exists custom_amount numeric;
