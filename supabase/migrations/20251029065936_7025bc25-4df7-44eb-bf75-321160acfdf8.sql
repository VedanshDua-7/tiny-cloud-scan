-- Create enum for user roles
CREATE TYPE app_role AS ENUM ('user', 'admin');

-- Create users table with hardcoded demo accounts
CREATE TABLE public.demo_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create upload logs table
CREATE TABLE public.upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('clean', 'malicious')),
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for demo_users (read-only for authenticated)
CREATE POLICY "Anyone can read demo users"
  ON public.demo_users
  FOR SELECT
  TO public
  USING (true);

-- RLS policies for upload_logs
CREATE POLICY "Users can view all upload logs"
  ON public.upload_logs
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow service role to insert logs"
  ON public.upload_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Insert hardcoded demo users
INSERT INTO public.demo_users (username, password_hash, role) VALUES
  ('demo_user', 'password123', 'user'),
  ('demo_admin', 'admin123', 'admin');

-- Create storage bucket for encrypted files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('encrypted-files', 'encrypted-files', false, 2097152, ARRAY['application/octet-stream']);

-- Storage policies for encrypted files bucket
CREATE POLICY "Service role can upload files"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'encrypted-files');

CREATE POLICY "Service role can read files"
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (bucket_id = 'encrypted-files');

CREATE POLICY "Authenticated users can list files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'encrypted-files');