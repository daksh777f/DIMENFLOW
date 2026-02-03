# 🔐 Enable Anonymous Sign-ins in Supabase

## Quick Fix (2 minutes)

I've opened your Supabase Auth Providers page. Follow these steps:

### Step 1: Enable Anonymous Sign-ins

1. In the Supabase dashboard (already open), scroll down to find **"Anonymous sign-ins"**
2. Toggle the switch to **ON** (enable it)
3. Click **"Save"** if there's a save button

That's it! Your app will now allow anonymous users to sign in.

### Alternative: Test with Email Auth (Optional)

If you want to test with email instead:

1. In the same Auth Providers page, find **"Email"**
2. Make sure it's enabled
3. You can use any test email (no verification needed for local dev)

### Why Anonymous Auth?

Your app uses anonymous sign-ins by default so users can:
- Try the app immediately without registration
- Create projects and test features
- Optionally upgrade to Google sign-in later

### Verify It's Working

After enabling:

1. Go to: http://localhost:5173
2. Click "Start Creating" or sign in button
3. Should work now! ✅

### Current Setup Status

- ✅ Backend running
- ✅ Database connected  
- ✅ Storage bucket created (`user-content`)
- ⚠️ Storage policies needed (run the SQL from storage-policies.sql)
- ⚠️ **Anonymous sign-ins - ENABLE THIS NOW**

---

**Action:** Toggle "Anonymous sign-ins" to ON in the Supabase dashboard (already open for you)
