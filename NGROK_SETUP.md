# ngrok Setup for Live Mode

## Step 1: Get ngrok Authtoken (Free)

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up (it's free)
3. After signing up, go to: https://dashboard.ngrok.com/get-started/your-authtoken
4. Copy your authtoken

## Step 2: Configure ngrok

Run this command (replace YOUR_AUTHTOKEN with your actual token):
```bash
~/ngrok config add-authtoken YOUR_AUTHTOKEN
```

## Step 3: Start ngrok

In a terminal, run:
```bash
~/ngrok http 3000
```

You'll see output like:
```
Forwarding   https://xxxx-xx-xx-xx-xx.ngrok-free.app -> http://localhost:3000
```

## Step 4: Copy the HTTPS URL

Copy the `https://xxxx-xx-xx-xx-xx.ngrok-free.app` URL

## Step 5: Update .env.local

Add or update this line in `.env.local`:
```env
NEXT_PUBLIC_APP_URL=https://xxxx-xx-xx-xx-xx.ngrok-free.app
```

(Replace with your actual ngrok URL)

## Step 6: Restart Dev Server

The server should already be running. If not:
```bash
npm run dev
```

## Step 7: Test

1. Visit your ngrok URL (not localhost)
2. Click "Create an account!"
3. Click "Add information"

**Important:** Keep the `ngrok http 3000` terminal window open while testing!
