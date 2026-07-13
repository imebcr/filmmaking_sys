import Image from 'next/image'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/server-supabase'

function anonymizeIp(ip: string | null): string | null {
  if (!ip) return null
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`
  return ip.split(':')[0] + ':0'
}

export default async function ClientSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServerSupabaseClient()

  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('*, project:projects(client_name)')
    .eq('client_share_token', token)
    .single()

  const isExpired = deliverable?.client_share_expires_at && new Date(deliverable.client_share_expires_at) < new Date()

  if (!deliverable || isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #E9FCFF 0%, #A9EFFB 45%, #E8EBEF 100%)' }}>
        <div className="glass rounded-3xl p-8 max-w-sm text-center">
          <Image src="/logo.png" alt="Zidny" width={100} height={38} className="object-contain mx-auto mb-4" style={{ height: 'auto' }} />
          <p className="text-navy font-semibold">Ce lien n’est plus disponible.</p>
          <p className="text-navy/45 text-sm mt-1">Il a peut-être expiré ou a été révoqué. Contactez votre interlocuteur Zidny.</p>
        </div>
      </div>
    )
  }

  const headerList = await headers()
  const ip = anonymizeIp(headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null)
  const log = Array.isArray(deliverable.client_share_access_log) ? deliverable.client_share_access_log : []
  await supabase
    .from('deliverables')
    .update({ client_share_access_log: [...log, { at: new Date().toISOString(), ip }] })
    .eq('id', deliverable.id)

  const fileUrl = `/api/deliverables/${deliverable.id}/file?share_token=${token}`
  const projectName = (deliverable.project as { client_name?: string } | null)?.client_name ?? 'Votre projet'

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #E9FCFF 0%, #A9EFFB 45%, #E8EBEF 100%)' }}>
      <div className="w-full max-w-2xl">
        <div className="glass rounded-3xl p-6 sm:p-8">
          <Image src="/logo.png" alt="Zidny" width={110} height={40} className="object-contain mb-6" style={{ height: 'auto' }} />

          <h1 className="text-navy font-bold text-xl mb-1">{projectName}</h1>
          <p className="text-navy/45 text-sm mb-6">Votre livraison est prête.</p>

          {deliverable.mime_type.startsWith('video/') && (
            <video controls className="w-full rounded-2xl bg-black" src={fileUrl} />
          )}
          {deliverable.mime_type.startsWith('audio/') && (
            <audio controls className="w-full" src={fileUrl} />
          )}
          {deliverable.mime_type.startsWith('image/') && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={projectName} className="w-full rounded-2xl object-contain bg-navy/5" />
          )}

          <a
            href={fileUrl}
            download
            className="mt-6 block text-center w-full py-3 rounded-xl bg-brand hover:bg-ocean text-white font-semibold transition-colors shadow-sm shadow-brand/25"
          >
            Télécharger
          </a>

          <p className="text-navy/30 text-xs text-center mt-6">Livré par Zidny</p>
        </div>
      </div>
    </div>
  )
}
