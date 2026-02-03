-- FIBOx3D Studio Supabase Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- ========== Users Table ==========
-- Stores user quota information and account details
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  images_quota INTEGER DEFAULT 200,
  models_quota INTEGER DEFAULT 100,
  images_used INTEGER DEFAULT 0,
  models_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ========== Projects Table ==========
-- Stores user projects metadata
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own projects
CREATE POLICY "Users can manage own projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- ========== Database Functions ==========

-- Function to increment images_used
CREATE OR REPLACE FUNCTION increment_images_used(user_id UUID, increment_by INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET images_used = images_used + increment_by,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment models_used
CREATE OR REPLACE FUNCTION increment_models_used(user_id UUID, increment_by INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET models_used = models_used + increment_by,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== Storage Buckets ==========
-- Note: Create this bucket in Supabase Storage UI
-- Bucket name: 'user-content'
-- Settings:
--   - Public bucket: Yes (for direct image access)
--   - File size limit: 50MB
--   - Allowed MIME types: image/*, application/json, model/gltf-binary

-- Storage policies (apply in Supabase Storage section):
-- 1. Allow authenticated users to upload to their own folder:
--    Path pattern: {user_id}/*
--    Policy: INSERT with auth.uid() = user_id
--
-- 2. Allow public read access:
--    Path pattern: *
--    Policy: SELECT (no restrictions)
--
-- 3. Allow users to delete their own files:
--    Path pattern: {user_id}/*
--    Policy: DELETE with auth.uid() = user_id

-- ========== Triggers ==========

-- Trigger to update updated_at on users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on projects table
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== Initial Setup Complete ==========
-- After running this script:
-- 1. Go to Supabase Storage and create the 'user-content' bucket
-- 2. Set the bucket to public
-- 3. Configure the storage policies as described above
