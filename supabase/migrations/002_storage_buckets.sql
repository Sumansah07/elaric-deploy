-- ============================================
-- Storage Buckets for Elaric AI
-- ============================================
-- Description: Configure storage buckets for thumbnails and assets

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'thumbnails',
    'thumbnails',
    TRUE,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  ),
  (
    'project-assets',
    'project-assets',
    FALSE,
    52428800, -- 50MB limit
    ARRAY['text/html', 'text/css', 'application/javascript', 'application/json', 'text/plain']::text[]
  ),
  (
    'user-uploads',
    'user-uploads',
    FALSE,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']::text[]
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Thumbnails: Public read, authenticated write (own files only)
CREATE POLICY "Thumbnails are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Users can upload thumbnails for their projects"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can update their own thumbnails"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'thumbnails'
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can delete their own thumbnails"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'thumbnails'
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );

-- Project Assets: Private, authenticated access only
CREATE POLICY "Users can read their own project assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-assets'
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can upload project assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-assets'
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can update their project assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-assets'
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can delete their project assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-assets'
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );

-- User Uploads: Private, user-specific
CREATE POLICY "Users can read their own uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-uploads'
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-uploads'
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can update their uploads"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-uploads'
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can delete their uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-uploads'
    AND auth.uid()::text IN (
      SELECT clerk_user_id FROM users 
      WHERE id::text = (storage.foldername(name))[1]
    )
  );
