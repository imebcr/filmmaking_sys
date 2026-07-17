'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Check, AlertCircle, Send, ExternalLink } from 'lucide-react'

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

interface MemberProfile {
  id: string
  full_name: string
  email: string | null
  phone: string
  avatar_url: string | null
  roles: string[]
  telegram_chat_id: string | null
  telegram_linked_at: string | null
  notification_preferences: { email?: boolean; telegram?: boolean }
  quiet_hours_start: string
  quiet_hours_end: string
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-navy/50 text-xs mb-1.5 font-medium">{children}</label>
)

export default function MemberProfilePage() {
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emailNotif, setEmailNotif] = useState(true)
  const [telegramNotif, setTelegramNotif] = useState(true)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)

  const [telegramCode, setTelegramCode] = useState<string | null>(null)
  const [telegramCodeError, setTelegramCodeError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const load = () => {
    setLoadError(false)
    fetch('/api/profile').then((r) => r.json()).then((d) => {
      if (!d.member) { setLoadError(true); return }
      const m: MemberProfile = d.member
      setProfile(m)
      setFullName(m.full_name)
      setEmail(m.email ?? '')
      setPhone(m.phone ?? '')
      setEmailNotif(m.notification_preferences?.email !== false)
      setTelegramNotif(m.notification_preferences?.telegram !== false)
    }).catch(() => setLoadError(true)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        email,
        phone,
        notification_preferences: { email: emailNotif, telegram: telegramNotif },
      }),
    })
    setSaving(false)
    setMessage(res.ok ? 'Profil mis à jour.' : 'Échec de la mise à jour.')
  }

  const handleChangePassword = async () => {
    setPasswordMsg(null)
    const res = await fetch('/api/member/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const result = await res.json().catch(() => ({}))
    setPasswordMsg(res.ok ? 'Mot de passe changé.' : (result?.error ?? 'Échec.'))
    if (res.ok) { setCurrentPassword(''); setNewPassword('') }
  }

  const handleGenerateTelegramCode = async () => {
    setTelegramCodeError(null)
    const res = await fetch('/api/profile/telegram/generate-code', { method: 'POST' })
    const result = await res.json().catch(() => ({}))
    if (res.ok) {
      setTelegramCode(result.code)
    } else if (res.status === 401) {
      setTelegramCodeError('Votre session a expiré (souvent après une modification de compte) — déconnectez-vous et reconnectez-vous, puis réessayez.')
    } else {
      setTelegramCodeError(result?.error ?? 'Échec de la génération du code.')
    }
  }

  const handleAvatarChange = async (file: File | null) => {
    if (!file) return
    setAvatarUploading(true)
    const form = new FormData()
    form.append('avatar', file)
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: form })
    setAvatarUploading(false)
    if (res.ok) load()
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-navy/35 text-sm">Chargement…</div>

  if (loadError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-navy/45 text-sm">
        <p>Impossible de charger le profil.</p>
        <button
          onClick={() => { setLoading(true); load() }}
          className="px-4 py-2 rounded-xl border border-silver text-navy/60 hover:text-navy hover:bg-white/50 text-sm font-semibold transition-colors"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm">
        <h1 className="text-navy font-bold text-lg">Profil</h1>
        <p className="text-navy/45 text-xs mt-0.5">Vos informations et préférences</p>
      </div>

      <div className="p-6 max-w-xl space-y-6">
        {/* Avatar */}
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-brand/10 flex items-center justify-center shrink-0">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name} width={64} height={64} className="object-cover w-full h-full" />
            ) : (
              <span className="text-brand font-bold text-xl">{profile.full_name.charAt(0)}</span>
            )}
          </div>
          <div>
            <p className="text-navy font-semibold text-sm">{profile.full_name}</p>
            <label className="text-brand text-xs font-semibold cursor-pointer hover:text-ocean mt-1 inline-block">
              {avatarUploading ? 'Envoi…' : 'Changer la photo'}
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        {/* Info */}
        <section>
          <h2 className="text-navy font-semibold mb-3">Informations</h2>
          <div className="glass rounded-2xl p-4 space-y-3">
            <div>
              <Label>Nom affiché</Label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="border-t border-white/50 pt-3">
              <p className="text-navy/50 text-xs font-medium mb-2">Notifications</p>
              <label className="flex items-center gap-2 text-sm text-navy/70 mb-1.5">
                <input type="checkbox" checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} className="w-4 h-4" /> E-mail
              </label>
              <label className="flex items-center gap-2 text-sm text-navy/70">
                <input type="checkbox" checked={telegramNotif} onChange={(e) => setTelegramNotif(e.target.checked)} className="w-4 h-4" /> Telegram
              </label>
            </div>

            {message && <p className="text-brand text-xs font-medium">{message}</p>}
            <motion.button
              onClick={handleSaveProfile} disabled={saving}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-2 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </motion.button>
          </div>
        </section>

        {/* Telegram */}
        <section>
          <h2 className="text-navy font-semibold mb-3">Telegram</h2>
          <div className="glass rounded-2xl p-4 space-y-3">
            {profile.telegram_chat_id ? (
              <p className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium"><Check size={14} /> Telegram lié</p>
            ) : (
              <>
                <p className="text-navy/55 text-sm">
                  {TELEGRAM_BOT_USERNAME
                    ? 'Générez un code puis ouvrez Telegram pour lier votre compte.'
                    : <>Générez un code puis envoyez <code className="text-brand">/start &lt;code&gt;</code> au bot <strong>@{'<bot non configuré>'}</strong> sur Telegram.</>}
                </p>
                {telegramCode ? (
                  <div className="glass-sm rounded-xl p-3 text-center space-y-2">
                    <p className="text-navy font-bold text-2xl tracking-widest">{telegramCode}</p>
                    <p className="text-navy/40 text-[11px]">Valide 10 minutes</p>
                    {TELEGRAM_BOT_USERNAME && (
                      <a
                        href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${telegramCode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors shadow-sm shadow-brand/25"
                      >
                        <ExternalLink size={12} /> Ouvrir Telegram
                      </a>
                    )}
                  </div>
                ) : (
                  <button onClick={handleGenerateTelegramCode} className="flex items-center gap-1.5 text-brand text-sm font-semibold hover:text-ocean">
                    <Send size={13} /> Générer un code
                  </button>
                )}
                {telegramCodeError && (
                  <p className="flex items-start gap-1.5 text-red-500 text-xs"><AlertCircle size={12} className="mt-0.5 shrink-0" /> {telegramCodeError}</p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Password */}
        <section>
          <h2 className="text-navy font-semibold mb-3">Mot de passe</h2>
          <div className="glass rounded-2xl p-4 space-y-3">
            <div>
              <Label>Mot de passe actuel</Label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <Label>Nouveau mot de passe</Label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            {passwordMsg && (
              <p className={`flex items-center gap-1.5 text-xs font-medium ${passwordMsg.includes('changé') ? 'text-emerald-600' : 'text-red-500'}`}>
                <AlertCircle size={12} /> {passwordMsg}
              </p>
            )}
            <button
              onClick={handleChangePassword}
              disabled={!currentPassword || newPassword.length < 8}
              className="w-full py-2 rounded-xl border border-silver text-navy/60 hover:text-navy hover:bg-white/50 text-sm font-semibold transition-colors disabled:opacity-40"
            >
              Changer le mot de passe
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
