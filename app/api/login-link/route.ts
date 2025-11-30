import { NextRequest, NextResponse } from 'next/server'
import { createLoginLink } from '@/lib/stripe/connect'

/**
 * POST /api/login-link
 * Creates a login link for creators to access their Stripe Express Dashboard
 * 
 * Body:
 * {
 *   accountId: string (Stripe Connect account ID)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId' },
        { status: 400 }
      )
    }

    const loginLink = await createLoginLink(accountId)

    return NextResponse.json({ url: loginLink.url })
  } catch (error: any) {
    console.error('Error creating login link:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create login link' },
      { status: 500 }
    )
  }
}

