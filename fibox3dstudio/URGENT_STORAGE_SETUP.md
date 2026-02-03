# ⚠️ URGENT: Create Storage Bucket Now!

## Your Backend is Running ✅

Your backend is now working at: http://localhost:3001/

However, you still have this **CRITICAL ERROR**:
```
Bucket not found
```

## 🎯 DO THIS NOW (5 Minutes)

### Step 1: Go to Supabase Storage

1. Open: https://supabase.com/dashboard/project/cfxkbsigrfjprrwcfvwl/storage/buckets
2. You should see your Supabase dashboard

### Step 2: Create the Bucket

1. Click the green **"New bucket"** button (top right)
2. Fill in:
   - **Name:** `user-content` (EXACTLY this - no spaces!)
   - **Public bucket:** ✓ CHECK THIS BOX
   - Leave other settings as default
3. Click **"Create bucket"**

### Step 3: Add Storage Policies

After creating the bucket:

1. Click on the **"user-content"** bucket you just created
2. Go to the **"Policies"** tab
3. Click **"New Policy"** button

#### Add These 3 Policies:

**Policy 1: Public Read**
- Click **"New Policy"** → **"For full customization"**
- Name: `Public read access`
- Allowed operation: **SELECT** (check this box)
- Target roles: Select **"public"**
- Leave USING and WITH CHECK empty
- Click **"Review"** then **"Save"**

**Policy 2: Authenticated Upload**
- Click **"New Policy"** → **"For full customization"**
- Name: `Authenticated users can upload`
- Allowed operation: **INSERT** (check this box)
- Target roles: Select **"authenticated"**
- USING expression: Leave empty
- WITH CHECK expression: 
  ```sql
  (auth.uid()::text = (storage.foldername(name))[1])
  ```
- Click **"Review"** then **"Save"**

**Policy 3: Authenticated Delete**
- Click **"New Policy"** → **"For full customization"**
- Name: `Users can delete own files`
- Allowed operation: **DELETE** (check this box)
- Target roles: Select **"authenticated"**
- USING expression:
  ```sql
  (auth.uid()::text = (storage.foldername(name))[1])
  ```
- WITH CHECK: Leave empty
- Click **"Review"** then **"Save"**

### Step 4: Verify

In your terminal, you should see backend is running:
```
✓ Server listening on port 3001
✓ Health check: http://localhost:3001/health
```

### Step 5: Test Your App

1. Open your frontend: http://localhost:5173
2. Click "Start Creating"
3. Try to create a project
4. Should work now! ✅

## 🔍 Quick Check

Visit: http://localhost:3001/health

Should show:
```json
{
  "status": "ok",
  "supabase": "connected",
  "briaApiKey": "configured",
  "geminiApiKey": "configured",
  "falKey": "configured"
}
```

## ⏰ About the Gemini API Error

The Gemini API error (429 - quota exceeded) happens when:
- You make too many requests too quickly
- Free tier limit: 60 requests/minute

**Solutions:**
1. **Wait 1 minute** - quota resets automatically
2. **Get a new API key** at: https://aistudio.google.com/app/apikey
3. **Use the app** - some features will work without Gemini

The app will still work for:
- ✅ Image generation (uses Bria FIBO)
- ✅ 3D model generation (uses Fal.ai)
- ❌ Scene analysis (needs Gemini)
- ❌ Bounding box detection (needs Gemini)

## 📋 Summary

**What's Working:**
- ✅ Backend running on port 3001
- ✅ Supabase database connected
- ✅ API keys configured
- ✅ Root endpoint shows API info

**What You Need to Do:**
- ⚠️ **CREATE STORAGE BUCKET** (do this now!)
- ⚠️ **ADD STORAGE POLICIES** (after creating bucket)
- 🕐 Wait for Gemini quota OR get new key (optional)

## 🎉 After Creating the Bucket

Your app will be fully functional! You can:
- Sign in anonymously
- Generate images with FIBO
- Create and save projects
- Generate 3D models
- View your renders gallery

---

**Next Action:** Go to Supabase and create that storage bucket NOW! → https://supabase.com/dashboard/project/cfxkbsigrfjprrwcfvwl/storage/buckets
