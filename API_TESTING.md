# API Testing Guide - Creator Profile Workflow

## Workflow: User Creates Profile → Gets Link

### Step 1: Create Creator Profile

**Endpoint:** `POST /api/creators`

**Request:**
```json
{
  "user_id": "uuid-from-supabase-auth",
  "username": "johndoe",
  "display_name": "John Doe",
  "bio": "Content creator"
}
```

**Response:**
```json
{
  "id": "creator-uuid",
  "username": "johndoe",
  "page_url": "@johndoe",
  "link": "https://fanrae.com/@johndoe",
  "message": "Creator profile created successfully"
}
```

**Validation:**
- Username must be 3-30 characters
- Only letters, numbers, underscores, hyphens allowed
- Username must be unique
- User can only have one creator profile

### Step 2: Get Creator Profile by Username

**Endpoint:** `GET /api/creators?username=johndoe`

**OR**

**Endpoint:** `GET /api/creators/@johndoe`

**Response:**
```json
{
  "id": "creator-uuid",
  "username": "johndoe",
  "page_url": "@johndoe",
  "display_name": "John Doe",
  "bio": "Content creator",
  "profile_image_url": null,
  "is_active": true,
  "link": "https://fanrae.com/@johndoe"
}
```

## Testing with cURL

### Create Profile:
```bash
curl -X POST http://localhost:3000/api/creators \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id-here",
    "username": "testcreator",
    "display_name": "Test Creator",
    "bio": "This is a test"
  }'
```

### Get Profile:
```bash
curl http://localhost:3000/api/creators?username=testcreator
```

## Link Format

- **Page URL format:** `@username` (stored in database)
- **Full link format:** `https://fanrae.com/@username`
- **Frontend route:** Will be `app/@[username]/page.tsx` or `app/[username]/page.tsx`

## Next Steps

After profile creation:
1. ✅ Creator gets their link: `fanrae.com/@username`
2. ⏳ Creator needs to complete Stripe Connect onboarding (via `/api/account` and `/api/account_link`)
3. ⏳ Creator needs to subscribe to platform (monthly fee)
4. ⏳ Creator can then create content and accept payments

