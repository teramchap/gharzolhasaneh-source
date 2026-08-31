-- One-time repair: create any installment rows that were missed for
-- existing shares/months due to the earlier duration-extension bug.
insert into installments (share_id, fund_month_id, due_amount)
select s.id, fm.id, s.amount
from shares s
join fund_codes fc on fc.id = s.code_id
join fund_months fm on fm.fund_id = fc.fund_id
left join installments i on i.share_id = s.id and i.fund_month_id = fm.id
where i.id is null;
