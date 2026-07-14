import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDZD(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-DZ')} DA`
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function projectTypeStyle(color: string): { border: string; bg: string; text: string } {
  return {
    border: `border`,
    bg: `${color}20`,
    text: color,
  }
}
