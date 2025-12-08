import { getServerSession } from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createDefaultAvailabilityRules } from '@/lib/availability/defaults'

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
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.providerAccountId = account.providerAccountId
      }
      
      // Look up or create user in database and store the DB UUID
      if (token.email && supabaseAdmin && !token.dbUserId) {
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', token.email)
          .single()
        
        if (existingUser) {
          token.dbUserId = existingUser.id
        } else {
          // Create user with auto-generated UUID
          const { data: newUser } = await supabaseAdmin
            .from('users')
            .insert({
              email: token.email,
              name: token.name as string,
              image: token.picture as string,
              username: (token.email as string).split('@')[0],
            })
            .select('id')
            .single()
          
          if (newUser) {
            token.dbUserId = newUser.id
            // Create default availability rules for new users
            await createDefaultAvailabilityRules(supabaseAdmin, newUser.id)
            console.log(`Created default availability rules for new user ${newUser.id}`)
          }
        }
      }
      
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string | undefined
      session.expiresAt = token.expiresAt as number | undefined
      
      // Use the database UUID, not Google's user ID
      if (session.user) {
        session.user.id = token.dbUserId as string
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
