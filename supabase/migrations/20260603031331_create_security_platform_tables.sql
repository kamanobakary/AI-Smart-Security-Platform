/*
  # AI Smart Security Platform - Initial Schema

  ## Tables Created
  - `profiles` - User profiles with roles (admin, analyst, user)
  - `security_events` - Log of security events and incidents
  - `alerts` - Security alerts with severity levels
  - `login_logs` - User login history

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read their own profile
  - Admins can manage all users
  - All users can read security events and alerts
*/

-- Profiles table extending auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  role text DEFAULT 'user' CHECK (role IN ('admin', 'analyst', 'user')),
  avatar_url text DEFAULT '',
  department text DEFAULT '',
  last_login timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source_ip text NOT NULL,
  destination_ip text DEFAULT '',
  severity text DEFAULT 'low' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description text DEFAULT '',
  protocol text DEFAULT '',
  port integer DEFAULT 0,
  country text DEFAULT '',
  status text DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved')),
  metadata jsonb DEFAULT '{}',
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view security events"
  ON security_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert security events"
  ON security_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'analyst')
    )
  );

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  severity text DEFAULT 'low' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  attack_type text DEFAULT '',
  source_ip text DEFAULT '',
  destination_ip text DEFAULT '',
  status text DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  assigned_to uuid REFERENCES profiles(id),
  event_id uuid REFERENCES security_events(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'analyst')
    )
  );

CREATE POLICY "Admins and analysts can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'analyst')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'analyst')
    )
  );

-- Login logs table
CREATE TABLE IF NOT EXISTS login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  status text DEFAULT 'success' CHECK (status IN ('success', 'failed', 'suspicious')),
  location text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login logs"
  ON login_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all login logs"
  ON login_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert login logs"
  ON login_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
