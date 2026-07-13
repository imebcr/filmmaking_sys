import type { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { verifyPassword } from '@/lib/member-security'

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/member-login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password
        if (!email || !password) {
          console.warn('[auth] missing email or password in request')
          return null
        }

        const supabase = createServerSupabaseClient()
        const { data: member, error } = await supabase
          .from('editors')
          .select('*')
          .eq('email', email)
          .single()

        if (error) {
          console.warn(`[auth] Supabase query failed for "${email}":`, error.message)
          return null
        }
        if (!member || !member.password_hash) {
          console.warn(`[auth] no member found (or no password set) for "${email}"`)
          return null
        }
        if (member.account_status !== 'active') {
          console.warn(`[auth] member "${email}" has account_status="${member.account_status}", not "active"`)
          return null
        }

        const valid = await verifyPassword(password, member.password_hash)
        if (!valid) {
          console.warn(`[auth] password mismatch for "${email}"`)
          return null
        }

        return {
          id: member.id,
          email: member.email,
          name: member.full_name,
          roles: member.roles ?? [],
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id
        token.roles = (user as unknown as { roles: string[] }).roles ?? []
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.roles = (token.roles as string[]) ?? []
      }
      return session
    },
  },
}
