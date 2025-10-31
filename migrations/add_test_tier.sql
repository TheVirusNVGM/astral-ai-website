-- Migration: Add 'test' tier support and create test_keys table
-- Run this in Supabase SQL Editor

-- Step 1: Update users table to support 'test' tier
-- Check if subscription_tier is already text/enum and add 'test' to allowed values
-- If using enum, you may need to alter the enum type first
ALTER TABLE users 
ALTER COLUMN subscription_tier 
TYPE text;

-- Update existing CHECK constraint or create new one to allow 'test'
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_subscription_tier_check;

ALTER TABLE users 
ADD CONSTRAINT users_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'test', 'premium', 'pro'));

-- Step 2: Create test_keys table
CREATE TABLE IF NOT EXISTS test_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  
  -- Ensure key is unique
  CONSTRAINT unique_key UNIQUE (key)
);

-- Step 3: Insert 20 pre-generated test keys
INSERT INTO test_keys (key) VALUES
  ('TEST-EMKG-SERZ-ZZGG'),
  ('TEST-BT6T-NPNH-PVTW'),
  ('TEST-7QDR-RXWP-DKDQ'),
  ('TEST-UKJO-8CPG-6WCR'),
  ('TEST-39ML-R57A-0V3E'),
  ('TEST-UW9J-26LH-21HZ'),
  ('TEST-DD86-4HZL-K8DO'),
  ('TEST-JJXS-QSRQ-0ZVF'),
  ('TEST-M2N7-VI8T-MU2B'),
  ('TEST-4FCP-2JHR-NX4C'),
  ('TEST-33S6-WUWY-T22R'),
  ('TEST-S75C-HEXF-YIEW'),
  ('TEST-A7Y4-RTCV-46GE'),
  ('TEST-NN3W-GH3W-GFOW'),
  ('TEST-RKDU-7RHU-8MT8'),
  ('TEST-EQXR-NJ2F-XGRX'),
  ('TEST-QLNN-V09V-A8GL'),
  ('TEST-JE91-PDD1-B7DL'),
  ('TEST-H8RI-4MDE-NYCF'),
  ('TEST-KPJL-4V78-Q8T9')
ON CONFLICT (key) DO NOTHING;

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_test_keys_key ON test_keys(key);
CREATE INDEX IF NOT EXISTS idx_test_keys_user_id ON test_keys(user_id);

-- Step 5: Enable RLS (Row Level Security) - optional but recommended
ALTER TABLE test_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for API)
CREATE POLICY "Service role full access" ON test_keys
  FOR ALL
  USING (true)
  WITH CHECK (true);

