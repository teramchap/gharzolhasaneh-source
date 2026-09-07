import { useRef } from 'react'

export default function ImageUploadInput({ files, onChange, multiple = true, label }) {
  const inputRef = useRef()

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-purple-700/40 bg-brand-purple-100 px-4 py-4 text-sm font-semibold text-brand-purple-900 hover:bg-brand-purple-100/70"
      >
        <UploadIcon className="h-5 w-5" />
        {label ?? (multiple ? 'تصاویر خود را بارگذاری کنید' : 'تصویر خود را بارگذاری کنید')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          const picked = Array.from(e.target.files)
          onChange(multiple ? [...(files ?? []), ...picked] : picked)
          e.target.value = ''
        }}
        className="hidden"
      />
      {files?.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-brand-purple-100 px-2 py-1 text-[11px] text-brand-purple-900">
              {f.name.length > 14 ? f.name.slice(0, 12) + '…' : f.name}
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="text-brand-red-600"
                aria-label="حذف"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function UploadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </svg>
  )
}
