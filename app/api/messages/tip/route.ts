import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client'
import { getStripeServerClient } from '@/lib/stripe/server'

/**
 * POST /api/messages/tip
 * Send a tip to a creator
 * 
 * Body:
 * {
 *   conversationId: string (required)
 *   userId: string (required)
 *   userEmail: string (required)
 *   amount: number (required)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, userId, userEmail, amount } = body

    if (!conversationId || !userId || !userEmail || !amount) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (amount < 1) {
      return NextResponse.json(
        { error: 'Minimum tip amount is $1.00' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()
    const stripe = getStripeServerClient()

    // Get conversation and verify fan is the sender
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('creator_id, fan_id, creator:creators!conversations_creator_id_fkey(id, user_id)')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (conversation.fan_id !== userId) {
      return NextResponse.json(
        { error: 'Only fans can send tips' },
        { status: 403 }
      )
    }

    const creator = conversation.creator as any
    const creatorId = creator.id

    // Calculate commission (20% platform, 80% creator)
    const commission = amount * 0.20
    const creatorAmount = amount * 0.80

    // Create tip record
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .insert({
        conversation_id: conversationId,
        fan_id: userId,
        creator_id: creatorId,
        amount: amount,
        commission: commission,
        creator_amount: creatorAmount,
        status: 'pending'
      })
      .select()
      .single()

    if (tipError) throw tipError

    // Determine if user is a fan or creator (fans send tips, creators receive them)
    // Since this endpoint is called by fans, redirect to fan messages
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single()

    const isFan = profile?.user_type === 'fan'
    const messagesPath = isFan ? '/fan/messages' : '/creator/messages'

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Tip to Creator',
              description: `Tip sent via messages`
            },
            unit_amount: Math.round(amount * 100) // Convert to cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}${messagesPath}?tip=success&conversationId=${conversationId}`,
      cancel_url: `${request.nextUrl.origin}${messagesPath}?tip=canceled&conversationId=${conversationId}`,
      metadata: {
        type: 'tip',
        tip_id: tip.id,
        conversation_id: conversationId,
        fan_id: userId,
        creator_id: creatorId,
        amount: amount.toString(),
        commission: commission.toString(),
        creator_amount: creatorAmount.toString()
      },
      customer_email: userEmail
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating tip:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create tip' },
      { status: 500 }
    )
  }
}

