// A number input that shows thousands separators while typing
// (e.g. "4,000,000") but always reports the plain numeric value via onChange.
export default function AmountInput({ value, onChange, placeholder, className }) {
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '')
    onChange(digits)
  }

  const display = value ? Number(value).toLocaleString('en-US') : ''

  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  )
}
