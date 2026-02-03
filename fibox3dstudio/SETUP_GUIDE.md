# FIBOx3D Studio Setup Guide

## Backend Setup

### 1. Get API Keys

#### Bria FIBO API Key
1. Go to https://bria.ai/
2. Sign up for an account
3. Navigate to API section
4. Copy your API key
5. Paste it in `backend/.env` as `BRIA_API_KEY`

#### Google Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key
5. Paste it in `backend/.env` as `GEMINI_API_KEY`

#### Fal.ai API Key
1. Go to https://fal.ai/
2. Sign up for an account
3. Go to https://fal.ai/dashboard/keys
4. Create a new API key
5. Copy the key
6. Paste it in `backend/.env` as `FAL_KEY`

### 2. Set up Supabase

#### Create Supabase Project
1. Go to https://supabase.com/
2. Click "Start your project" and sign in
3. Click "New project"
4. Enter a project name (e.g., "fibox3d-studio")
5. Set a database password (save this securely!)
6. Choose a region close to you
7. Click "Create new project" and wait for setup to complete

#### Get Supabase Credentials
1. In your Supabase dashboard, go to Settings → API
2. Copy the **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy the **anon public** key (for frontend)
4. Copy the **service_role** key (for backend - keep this secret!)

#### Set up Database Schema
1. In Supabase dashboard, go to SQL Editor
2. Open the file `backend/supabase-schema.sql` in your project
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click "Run" to create tables, functions, and policies

#### Set up Storage Bucket
1. In Supabase dashboard, go to Storage
2. Click "Create a new bucket"
3. Name it **user-content**
4. Make it **Public** (check the public bucket option)
5. Click "Create bucket"

#### Configure Storage Policies
1. Click on the **user-content** bucket
2. Go to "Policies" tab
3. Add the following policies:

**Policy 1: Public Read Access**
- Click "New Policy" → "For full customization"
- Policy name: `Public read access`
- Allowed operation: SELECT
- Target roles: `public`
- Click "Review" then "Save"

**Policy 2: Authenticated Upload**
- Click "New Policy" → "For full customization"
- Policy name: `Authenticated users can upload to own folder`
- Allowed operation: INSERT
- Target roles: `authenticated`
- USING expression: `(bucket_id = 'user-content'::text)`
- WITH CHECK expression: `(auth.uid()::text = (storage.foldername(name))[1])`
- Click "Review" then "Save"

**Policy 3: Authenticated Delete**
- Click "New Policy" → "For full customization"
- Policy name: `Users can delete own files`
- Allowed operation: DELETE
- Target roles: `authenticated`
- USING expression: `(auth.uid()::text = (storage.foldername(name))[1])`
- Click "Review" then "Save"

#### Enable Authentication Providers
1. In Supabase dashboard, go to Authentication → Providers
2. **Email** is enabled by default
3. **Enable Anonymous sign-ins**:
   - Scroll down to "Anonymous sign-ins"
   - Toggle it ON
4. **Enable Google OAuth** (optional):
   - Click on "Google" provider
   - Toggle "Enable Sign in with Google"
   - You'll need to get Google OAuth credentials:
     - Go to https://console.cloud.google.com/
     - Create a project (if you don't have one)
     - Enable Google+ API
     - Create OAuth 2.0 credentials
     - Set authorized redirect URIs to your Supabase callback URL
     - Copy Client ID and Client Secret to Supabase
   - Click "Save"

#### Update Backend Environment Variables
1. Create a `.env` file in the `backend` folder (copy from `.env.example`)
2. Add your Supabase credentials:
   ```
    SUPABASE_URL=https://your-project.supabase.co
    SUPABASE_SERVICE_KEY=your_service_role_key_here
   ```

### 3. Update Frontend Supabase Config

1. Open `frontend/src/firebase.js` (now used for Supabase despite the name)
2. Find the `supabaseConfig` object (around line 4)
3. Replace with your Supabase credentials:
   ```javascript
   const supabaseConfig = {
     url: "https://your-project.supabase.co",
     anonKey: "your-anon-public-key-here"
   }
   ```

## Running the Application

### Start Backend
```bash
cd backend
npm install
npm run dev
```
Backend will run on http://localhost:3001

### Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on http://localhost:5173

## Quick Test (No Setup Required)

If you just want to see the UI without functionality:
- Only run the frontend
- The UI will load but API calls will fail
- Good for exploring the interface

## Cost Considerations

- **Bria FIBO**: Check their pricing for image generation
- **Gemini**: Free tier available (60 requests/minute)
- **Fal.ai**: Pay-as-you-go pricing for 3D model generation
- **Supabase**: Free tier includes:
  - 500MB database space
  - 1GB file storage
  - 50,000 monthly active users
  - 2GB bandwidth
  - Perfect for testing and small projects!

## Troubleshooting

### Backend won't start
- Check that all API keys are set in `.env`
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set correctly
- Make sure port 3001 is not in use
- Run `npm install` in the backend folder to ensure dependencies are installed

### Frontend shows blank screen
- Check browser console for errors (F12)
- Verify Supabase config is properly set in `frontend/src/firebase.js`
- Try clearing browser cache
- Make sure you've run `npm install` in the frontend folder

### API calls fail
- Ensure backend is running on port 3001
- Check that API keys are valid
- Verify Supabase authentication is enabled (Anonymous sign-ins)
- Check that the database schema has been set up (run `supabase-schema.sql`)
- Verify the `user-content` storage bucket exists and is public

### Database errors
- Make sure you've run the SQL schema from `backend/supabase-schema.sql`
- Check that Row Level Security policies are properly configured
- Verify database functions (`increment_images_used`, `increment_models_used`) exist

### Storage/Upload errors
- Verify the `user-content` bucket exists and is set to public
- Check that storage policies are configured correctly
- Ensure authenticated users have permission to upload to their own folders
