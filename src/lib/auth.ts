import { getServerSession } from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase/server'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.providerAccountId = account.providerAccountId
      }
      if (user) {
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string | undefined
      session.expiresAt = token.expiresAt as number | undefined
      
      // Set user ID from token - use sub (Google's user ID) as fallback
      if (session.user) {
        session.user.id = (token.userId as string) || (token.sub as string)
      }
      
      // Ensure user exists in Supabase
      if (supabaseAdmin && session.user?.email && session.user?.id) {
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', session.user.email)
          .single()
        
        if (!existingUser) {
          // Create user in database
          await supabaseAdmin.from('users').insert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            image: session.user.image,
            username: session.user.email?.split('@')[0],
          })
        }
      }
      
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

export async function auth() {
  return getServerSession(authOptions)
}
