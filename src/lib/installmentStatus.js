export const INSTALLMENT_STATUS_LABEL = {
  null: { text: 'پرداخت نشده', className: 'bg-gray-100 text-gray-500' },
  pending_review: { text: 'در انتظار تایید', className: 'bg-brand-yellow-200 text-brand-purple-900' },
  pending_transfer: { text: 'در انتظار تایید', className: 'bg-brand-yellow-200 text-brand-purple-900' },
  rejected: { text: 'رد شده', className: 'bg-brand-red-100 text-brand-red-600' },
}

export function installmentStatusLabel(inst) {
  if (inst.deducted) {
    return { text: 'کسر از سهم', className: 'bg-brand-green-100 text-brand-green-600' }
  }
  if (inst.deduction_requested) {
    return { text: 'در انتظار تایید کسر از سهم', className: 'bg-brand-yellow-200 text-brand-purple-900' }
  }
  if (inst.status === 'confirmed') {
    return inst.is_partial
      ? { text: 'پرداخت‌شده ناقص', className: 'bg-brand-yellow-200 text-brand-purple-900' }
      : { text: 'پرداخت‌شده', className: 'bg-brand-green-100 text-brand-green-600' }
  }
  return INSTALLMENT_STATUS_LABEL[inst.status] ?? INSTALLMENT_STATUS_LABEL[null]
}
