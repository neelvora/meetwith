import { getServerSession } from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
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
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        if (!supabaseAdmin) {
          throw new Error('Database not configured')
        }

        // Look up user by email
        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, email, name, image, password_hash, auth_provider')
          .eq('email', credentials.email.toLowerCase())
          .single()

        if (error || !user) {
          throw new Error('Invalid email or password')
        }

        // Check if user signed up with a different provider
        if (user.auth_provider === 'google' && !user.password_hash) {
          throw new Error('Please sign in with Google for this account')
        }

        // Verify password
        if (!user.password_hash) {
          throw new Error('Invalid email or password')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // For credentials login, user object contains our DB user
      if (user?.id && !account) {
        token.dbUserId = user.id
      }
      
      // For OAuth (Google), store tokens
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.providerAccountId = account.providerAccountId
      }
      
      // Look up or create user in database and store the DB UUID (for Google OAuth)
      if (token.email && supabaseAdmin && !token.dbUserId) {
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', token.email)
          .single()
        
        if (existingUser) {
          token.dbUserId = existingUser.id
        } else {
          // Create user with auto-generated UUID (Google OAuth users)
          const { data: newUser } = await supabaseAdmin
            .from('users')
            .insert({
              email: token.email,
              name: token.name as string,
              image: token.picture as string,
              username: (token.email as string).split('@')[0],
              auth_provider: 'google',
              email_verified: true,
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
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
}

export async function auth() {
  return getServerSession(authOptions)
}
