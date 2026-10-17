import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyActiveLoanRequests } from '../lib/loans'
import { jalaliMonthLabel } from '../lib/format'

const STAGE_MESSAGE = {
  awaiting_info: 'اطلاعات دریافت‌کننده را تکمیل کنید',
  awaiting_letter: 'در انتظار ارسال نامه توسط مدیر',
  awaiting_signature: 'نامه را چاپ، امضا و تحویل دهید',
}

export default function LoanBanner({ userId }) {
  const [requests, setRequests] = useState([])

  useEffect(() => {
    if (!userId) return
    getMyActiveLoanRequests(userId).then(({ data }) => setRequests(data ?? []))
  }, [userId])

  return requests.map((r) => (
    <Link
      key={r.id}
      to="/member/loans"
      className="mt-3 flex items-center justify-between rounded-xl bg-brand-yellow-300 px-4 py-3 shadow-sm"
    >
      <div>
        <p className="text-sm font-bold text-brand-purple-900">🎉 وام ۴ درصدی شما پذیرفته شد!</p>
        <p className="text-xs text-brand-purple-900/70">{jalaliMonthLabel(r.month)}</p>
        <p className="text-xs font-semibold text-brand-purple-900/90">{STAGE_MESSAGE[r.status]}</p>
      </div>
    </Link>
  ))
}
