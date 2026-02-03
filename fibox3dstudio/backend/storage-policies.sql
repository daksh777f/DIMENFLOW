-- Storage Policies for user-content bucket
-- Run these in Supabase SQL Editor

-- Policy 1: Allow public to read from user-content bucket
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-content');

-- Policy 2: Allow authenticated users to insert into their own folder
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-content' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-content' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
