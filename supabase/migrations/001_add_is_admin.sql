-- Add is_admin flag to users table
-- Run this in Supabase SQL Editor after the initial schema.sql

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant yourself admin access (replace with your email):
-- UPDATE public.users SET is_admin = TRUE WHERE email = 'norbert.ujj@gmail.com';
