# Authentication Setup Checklist

Quick verification that login and Google OAuth will work with your current setup.

## ✅ DNS Records (Already Done)
- [x] `@` A record pointing to your server
- [x] `www` CNAME pointing to Vercel

**Status:** ✅ **DONE** - Your DNS is correctly configured for hosting

---

## 🔍 Supabase Configuration Check

### 1. Redirect URLs in Supabase
Go to: **Supabase Dashboard** → **Authentication** → **URL Configuration**

Make sure these redirect URLs are added:
- [ ] `https://fanrae.com/**`
- [ ] `https://www.fanrae.com/**`
- [ ] `http://localhost:3000/**` (for local development)

**If missing:** Click "Add URL" and add them.

### 2. Site URL in Supabase
In the same page, check the **Site URL** field:
- Should be: `https://fanrae.com` (or your production domain)

**If different:** Update it to your production domain.

---

## 🔍 Google OAuth Configuration Check

### 1. Google Cloud Console Setup
Go to: [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**

Verify:
- [ ] OAuth 2.0 Client ID exists
- [ ] **Authorized redirect URIs** includes:
  - `https://sylupwafctdmhllfggjq.supabase.co/auth/v1/callback/google`

**If missing:** Add the Supabase callback URL to authorized redirect URIs.

### 2. Supabase Google Provider Setup
Go to: **Supabase Dashboard** → **Authentication** → **Providers** → **Google**

Verify:
- [ ] Google provider is enabled
- [ ] **Client ID** is filled in (from Google Cloud Console)
- [ ] **Client Secret** is filled in (from Google Cloud Console)

---

## 🔍 Environment Variables Check

In your production environment (Vercel), verify these are set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://sylupwafctdmhllfggjq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_APP_URL=https://fanrae.com
```

**To check in Vercel:**
1. Go to your project in Vercel
2. **Settings** → **Environment Variables**
3. Verify all Supabase and app URL variables are set for **Production**

---

## 🧪 How Authentication Will Work

### Default Flow (No Custom Domain Needed):
1. User visits `https://fanrae.com`
2. User clicks "Sign in with Google"
3. Redirected to: `https://sylupwafctdmhllfggjq.supabase.co/auth/v1/authorize?provider=google`
4. User authenticates with Google
5. Google redirects to: `https://sylupwafctdmhllfggjq.supabase.co/auth/v1/callback/google`
6. Supabase processes auth and redirects back to: `https://fanrae.com` (or your configured redirect)

**All of this works without any custom DNS records!**

---

## ✅ Quick Test Checklist

Once everything is configured, test:

1. [ ] Visit `https://fanrae.com` - site loads
2. [ ] Click "Sign in" or "Sign in with Google"
3. [ ] Google OAuth popup/redirect appears
4. [ ] After authenticating, redirected back to `https://fanrae.com`
5. [ ] User is logged in

If all of these work, you're good to go! 🎉

---

## 📝 Notes

- **Custom domain for auth** (`auth.fanrae.com`) is **optional** - only needed if you want a branded auth URL
- Default Supabase domain works perfectly fine
- No additional DNS records needed for basic authentication
- The custom domain setup in DNS_SETUP.md is for future enhancement, not required

---

## 🆘 Troubleshooting

**Issue:** "Redirect URL mismatch" error
- **Solution:** Add the exact redirect URL to Supabase's redirect URLs list

**Issue:** Google OAuth not working
- **Solution:** Verify the Supabase callback URL is in Google Cloud Console's authorized redirect URIs

**Issue:** Users can't access the site
- **Solution:** Check DNS records are properly propagated (can take up to 24 hours, usually 5-30 minutes)

