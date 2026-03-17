-- Add instagram_url to profiles
ALTER TABLE profiles
ADD COLUMN instagram_url TEXT NULL AFTER linkedin_url;
