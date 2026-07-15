'use client'

import { useState, useRef, useEffect, Children, isValidElement } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode // <option value="...">Label</option> elements, same as a native <select>
  className?: string
  style?: React.CSSProperties
  disabled?: boolean
}

interface OptionEntry {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

// Drop-in replacement for a native <select> — same children API (<option> elements) — but
// fully custom-styled, since the native dropdown popup can't be restyled with CSS at all.
export default function Select({ value, onChange, children, className = '', style, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const options: OptionEntry[] = []
  Children.forEach(children, (child) => {
    if (isValidElement<{ value?: string; children?: React.ReactNode; disabled?: boolean }>(child)) {
      options.push({ value: child.props.value ?? '', label: child.props.children, disabled: child.props.disabled })
    }
  })

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className={`relative ${className}`} style={style}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: `1px solid ${open ? '#2AA4E7' : 'rgba(42,164,231,0.25)'}`,
          color: '#0C224B',
          borderRadius: '0.625rem',
          padding: '0.5rem 0.75rem',
          fontSize: '0.875rem',
          boxShadow: open ? '0 0 0 3px rgba(42,164,231,0.18)' : undefined,
        }}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <ChevronDown size={14} className={`shrink-0 ml-2 text-navy/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-white/65"
          style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(10,96,173,0.15)' }}
        >
          {options.map((o, i) => (
            <button
              key={i}
              type="button"
              disabled={o.disabled}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl disabled:opacity-40 disabled:cursor-not-allowed ${
                o.value === value ? 'bg-brand text-white' : 'text-navy hover:bg-brand/10'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
