import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createDefaultAvailabilityRules } from '@/lib/availability/defaults'

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await request.json()
  const { email, password, name } = body

  // Validate input
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check if user already exists
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, auth_provider')
    .eq('email', normalizedEmail)
    .single()

  if (existingUser) {
    if (existingUser.auth_provider === 'google') {
      return NextResponse.json({ 
        error: 'An account with this email exists. Please sign in with Google.' 
      }, { status: 409 })
    }
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12)

  // Generate username from email
  let username = normalizedEmail.split('@')[0]
  
  // Check if username is taken and add suffix if needed
  const { data: usernameCheck } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', username)
    .single()

  if (usernameCheck) {
    username = `${username}${Date.now().toString().slice(-4)}`
  }

  // Create user
  const { data: newUser, error: createError } = await supabaseAdmin
    .from('users')
    .insert({
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      username,
      password_hash: passwordHash,
      auth_provider: 'email',
      email_verified: false, // Could implement email verification later
    })
    .select('id, email, name, username')
    .single()

  if (createError) {
    console.error('Error creating user:', createError)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }

  // Create default availability rules
  if (newUser) {
    await createDefaultAvailabilityRules(supabaseAdmin, newUser.id)
  }

  return NextResponse.json({ 
    success: true, 
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      username: newUser.username,
    }
  })
}
