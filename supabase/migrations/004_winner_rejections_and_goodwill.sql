alter type winner_status add value if not exists 'awaiting_account_info_approval';

alter table winners add column if not exists document_rejection_reason text;
alter table winners add column if not exists account_info_rejection_reason text;
