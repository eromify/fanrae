# Fanrae Platform

A creator monetization platform where creators can create pages, upload content, and users pay to unlock content. The platform takes a commission on all sales and charges creators a monthly subscription.

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Database & Auth**: Supabase
- **Payments**: Stripe
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Stripe account

### Setup Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   - Copy `env.example` to `.env.local`
   - Fill in your Supabase credentials
   - Fill in your Stripe keys
   - Set your app URL

3. **Set up Supabase**:
   - Create a new Supabase project
   - Go to Authentication > Settings
   - **Disable "Enable email confirmations"** (for MVP/testing - users can sign up immediately)
   - Enable Google OAuth in Authentication > Providers (optional)
   - Configure Google OAuth credentials (if using)
   - Copy your project URL and anon key to `.env.local`

4. **Set up Stripe**:
   - Create a Stripe account
   - Get your API keys from the dashboard
   - Set up webhooks (will be configured later)
   - Copy keys to `.env.local`

5. **Run the development server**:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth pages
│   └── (main)/            # Main app pages
├── lib/                    # Utility functions
│   ├── supabase/          # Supabase client setup
│   └── stripe/            # Stripe utilities
├── types/                  # TypeScript types
└── components/             # React components (to be added)
```

## Next Steps

1. Set up Supabase database schema (users, creators, content, purchases, subscriptions)
2. Configure Stripe products and pricing
3. Set up authentication flows
4. Create API routes for payments and content management
5. Build frontend components

