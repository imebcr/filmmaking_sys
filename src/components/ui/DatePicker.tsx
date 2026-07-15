'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format, parseISO, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths,
} from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  value: string // yyyy-MM-dd, or '' for none
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Drop-in replacement for a native <input type="date"> — the native calendar popup is
// rendered by the OS/browser shadow DOM and can't be restyled with CSS at all.
export default function DatePicker({ value, onChange, className = '', disabled }: Props) {
  const [open, setOpen] = useState(false)
  const selected = value && isValid(parseISO(value)) ? parseISO(value) : null
  const [viewMonth, setViewMonth] = useState(selected ?? new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selected) setViewMonth(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div ref={ref} className={`relative ${className}`}>
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
        <span className={selected ? '' : 'text-navy/40'}>{selected ? format(selected, 'dd MMM yyyy', { locale: fr }) : 'jj/mm/aaaa'}</span>
        <CalendarIcon size={13} className="shrink-0 ml-2 text-navy/40" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 rounded-2xl border border-white/65 p-3"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(10,96,173,0.15)', width: 260 }}
        >
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewMonth((m) => subMonths(m, 1))} className="p-1 rounded-lg hover:bg-brand/10 text-navy/50 hover:text-navy transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-navy font-semibold text-xs capitalize">{format(viewMonth, 'MMMM yyyy', { locale: fr })}</span>
            <button type="button" onClick={() => setViewMonth((m) => addMonths(m, 1))} className="p-1 rounded-lg hover:bg-brand/10 text-navy/50 hover:text-navy transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAY_LABELS.map((d, i) => (
              <div key={i} className="text-center text-[10px] text-navy/35 font-semibold">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const isSelected = selected !== null && isSameDay(day, selected)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => { onChange(format(day, 'yyyy-MM-dd')); setOpen(false) }}
                  className={`text-xs rounded-lg py-1.5 transition-colors ${
                    isSelected ? 'bg-brand text-white font-semibold'
                    : isToday(day) ? 'ring-1 ring-brand text-navy'
                    : isSameMonth(day, viewMonth) ? 'text-navy hover:bg-brand/10' : 'text-navy/25 hover:bg-brand/10'
                  }`}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
          {selected && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="mt-2 text-[11px] text-navy/40 hover:text-red-500 transition-colors"
            >
              Effacer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
