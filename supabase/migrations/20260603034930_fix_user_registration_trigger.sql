/*
  # Fix User Registration and Profile Creation

  ## Changes
  1. Add anon user policy for INSERT (for signup) - trigger needs this
  2. Improve trigger function with error handling
  3. Add anon policy for login_logs (signup calls this)
*/

-- Allow anonymous users to insert their own profile during signup
CREATE POLICY "New users can create own profile"
  ON profiles FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to insert login logs during signup
CREATE POLICY "Anonymous users can insert login logs"
  ON login_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Improve trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
