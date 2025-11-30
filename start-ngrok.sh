#!/bin/bash

# Start ngrok and get the HTTPS URL
echo "Starting ngrok..."
~/ngrok http 3000 > /tmp/ngrok.log 2>&1 &

# Wait for ngrok to start
sleep 3

# Get the HTTPS URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | sed 's/"public_url":"//;s/"//')

if [ -z "$NGROK_URL" ]; then
  echo "❌ Could not get ngrok URL. Make sure ngrok is running."
  echo "Run: ~/ngrok http 3000"
  exit 1
fi

echo "✅ ngrok is running at: $NGROK_URL"
echo ""
echo "Add this to your .env.local:"
echo "NEXT_PUBLIC_APP_URL=$NGROK_URL"
echo ""
echo "Or update it manually in .env.local"

