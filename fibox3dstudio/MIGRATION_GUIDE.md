# Firebase to Supabase Migration Summary

## Overview
The FIBOx3D Studio has been successfully migrated from Firebase to Supabase. This document outlines what changed and what you need to do.

## What Changed

### Backend Changes
- **Firebase Admin SDK** → **Supabase JS Client**
- **Firestore** → **PostgreSQL** (via Supabase)
- **Firebase Storage** → **Supabase Storage**
- **Firebase Auth** → **Supabase Auth**

### Files Modified
- `backend/fiboto3d.js` - Complete rewrite to use Supabase
- `backend/package.json` - Replaced `firebase-admin` with `@supabase/supabase-js`
- `frontend/src/firebase.js` - Complete rewrite to use Supabase (kept filename for minimal breaking changes)
- `frontend/package.json` - Added `@supabase/supabase-js`
- `SETUP_GUIDE.md` - Updated with Supabase setup instructions

### Files Created
- `backend/.env.example` - Template for environment variables
- `backend/supabase-schema.sql` - Database schema and setup script
- `MIGRATION_GUIDE.md` - This file

### Files to Remove (Optional Cleanup)
- `backend/fiboto3d-firebase-adminsdk-fbsvc-c308e88080.json` - No longer needed
- `backend/innovault-9d634-firebase-adminsdk-fbsvc-ffbc08d624.json` - No longer needed
- `backend/firestore-rules.txt` - No longer needed
- `backend/storage-rules.txt` - No longer needed

## Setup Steps

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Set Up Supabase Project

Follow the detailed instructions in [SETUP_GUIDE.md](SETUP_GUIDE.md), but here's a quick checklist:

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema (`backend/supabase-schema.sql`) in SQL Editor
3. Create the `user-content` storage bucket (make it public)
4. Configure storage policies for the bucket
5. Enable Anonymous authentication
6. (Optional) Enable Google OAuth

### 3. Configure Environment Variables

**Backend** (`backend/.env`):
```env
# API Keys (same as before)
BRIA_API_KEY=your_bria_api_key
GEMINI_API_KEY=your_gemini_api_key
FAL_KEY=your_fal_key

# NEW: Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

**Frontend** (`frontend/src/firebase.js` lines 4-7):
```javascript
const supabaseConfig = {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-public-key"
}
```

## Key Differences

### Database Structure

**Firebase (Firestore)**
- NoSQL document database
- Collections and documents
- No schema enforcement

**Supabase (PostgreSQL)**
- SQL relational database
- Tables with defined schemas
- Enforced data types and constraints
- Row Level Security policies

### Data Model Changes

#### Users Collection/Table
Firebase:
```javascript
{
  imagesQuota: 200,
  modelsQuota: 100,
  imagesUsed: 0,
  modelsUsed: 0,
  createdAt: Timestamp,
  email: string,
  isAnonymous: boolean
}
```

Supabase:
```sql
{
  id: UUID (references auth.users),
  images_quota: INTEGER,
  models_quota: INTEGER,
  images_used: INTEGER,
  models_used: INTEGER,
  created_at: TIMESTAMP,
  email: TEXT,
  is_anonymous: BOOLEAN
}
```

Note: Snake_case naming convention in Supabase (SQL standard)

### Authentication Changes

**Firebase:**
- Built-in anonymous auth
- Pop-up based Google OAuth
- Account linking (anonymous → Google)

**Supabase:**
- Built-in anonymous auth (must be enabled)
- Redirect-based Google OAuth
- Account linking requires manual data migration

### Storage Changes

**Firebase Storage:**
- Hierarchical file structure
- Rules-based access control
- Public URLs via `makePublic()`

**Supabase Storage:**
- Bucket-based organization
- Policy-based access control (SQL)
- Public buckets for direct access

### API Differences

#### Get User Token

**Before (Firebase):**
```javascript
const token = await auth.currentUser.getIdToken()
```

**After (Supabase):**
```javascript
const { data: { session } } = await supabase.auth.getSession()
const token = session.access_token
```

#### Database Queries

**Before (Firestore):**
```javascript
const userRef = db.collection('users').doc(userId)
const userDoc = await userRef.get()
const data = userDoc.data()
```

**After (Supabase):**
```javascript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()
```

#### Storage Upload

**Before (Firebase):**
```javascript
const file = bucket.file(filePath)
await file.save(buffer, { public: true })
await file.makePublic()
```

**After (Supabase):**
```javascript
await supabase.storage
  .from('user-content')
  .upload(filePath, buffer, { upsert: true })
  
const { data: { publicUrl } } = supabase.storage
  .from('user-content')
  .getPublicUrl(filePath)
```

## Benefits of Supabase

1. **Better Developer Experience**: Direct SQL access, easier debugging
2. **Cost Effective**: More generous free tier
3. **Real-time Capabilities**: Built-in subscriptions for live data
4. **Standard SQL**: More portable, easier to migrate data
5. **Open Source**: Can self-host if needed
6. **Better Tooling**: pgAdmin, SQL Editor, direct database access

## Migration Checklist

- [x] Backend code migrated to Supabase
- [x] Frontend code migrated to Supabase
- [x] Package dependencies updated
- [x] Database schema created
- [x] Setup guide updated
- [ ] Test anonymous authentication
- [ ] Test Google OAuth (if enabled)
- [ ] Test image generation and storage
- [ ] Test project save/load
- [ ] Test quota management
- [ ] Remove old Firebase files

## Testing

After setup, test these features:
1. Anonymous sign-in
2. Image generation with quota tracking
3. Project creation and saving
4. Project loading
5. Renders gallery
6. Google sign-in (if enabled)

## Need Help?

If you encounter issues:
1. Check the troubleshooting section in [SETUP_GUIDE.md](SETUP_GUIDE.md)
2. Verify all environment variables are set correctly
3. Check Supabase dashboard for errors in Auth, Database, and Storage sections
4. Review the SQL schema execution results
5. Check browser console (F12) for frontend errors
6. Check backend terminal for server errors

## Rollback (If Needed)

If you need to revert to Firebase:
1. Restore the original files from your git history
2. Run `npm install` in both backend and frontend
3. Set up Firebase credentials again
4. Restart the servers

However, Supabase is recommended for better performance and developer experience!
