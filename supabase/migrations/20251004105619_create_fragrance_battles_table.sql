/*
  # Fragrance Battle Tracking System

  ## Overview
  This migration creates a system to track fragrance battle wins and monthly leaderboards.

  ## New Tables
    
  ### `fragrance_battles`
  Tracks each time a fragrance wins a battle
  - `id` (uuid, primary key) - Unique identifier for each battle record
  - `fragrance_name` (text) - Name of the fragrance
  - `fragrance_brand` (text) - Brand of the fragrance
  - `fragrance_image` (text) - Image URL of the fragrance
  - `battle_month` (text) - Month identifier in YYYY-MM format
  - `created_at` (timestamptz) - When the battle win was recorded
  
  ### `fragrance_leaderboard`
  Aggregated monthly win counts for quick leaderboard queries
  - `id` (uuid, primary key) - Unique identifier
  - `fragrance_name` (text) - Name of the fragrance
  - `fragrance_brand` (text) - Brand of the fragrance
  - `fragrance_image` (text) - Image URL of the fragrance
  - `battle_month` (text) - Month identifier in YYYY-MM format
  - `win_count` (integer) - Total wins for this month
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on both tables
  - Allow anonymous users to INSERT battle records (track wins)
  - Allow anonymous users to SELECT leaderboard data (view rankings)
  - No UPDATE or DELETE permissions for data integrity

  ## Indexes
  - Index on battle_month for fast monthly queries
  - Composite index on (battle_month, win_count DESC) for leaderboard queries
*/

-- Create fragrance_battles table
CREATE TABLE IF NOT EXISTS fragrance_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fragrance_name text NOT NULL,
  fragrance_brand text NOT NULL,
  fragrance_image text,
  battle_month text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create fragrance_leaderboard table
CREATE TABLE IF NOT EXISTS fragrance_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fragrance_name text NOT NULL,
  fragrance_brand text NOT NULL,
  fragrance_image text,
  battle_month text NOT NULL,
  win_count integer DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(fragrance_name, fragrance_brand, battle_month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_battles_month ON fragrance_battles(battle_month);
CREATE INDEX IF NOT EXISTS idx_leaderboard_month_wins ON fragrance_leaderboard(battle_month, win_count DESC);

-- Enable Row Level Security
ALTER TABLE fragrance_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fragrance_leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fragrance_battles
CREATE POLICY "Anyone can insert battle records"
  ON fragrance_battles
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can view battle records"
  ON fragrance_battles
  FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for fragrance_leaderboard
CREATE POLICY "Anyone can view leaderboard"
  ON fragrance_leaderboard
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert leaderboard entries"
  ON fragrance_leaderboard
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update leaderboard counts"
  ON fragrance_leaderboard
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Function to increment leaderboard count
CREATE OR REPLACE FUNCTION increment_fragrance_win(
  p_name text,
  p_brand text,
  p_image text,
  p_month text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO fragrance_leaderboard (fragrance_name, fragrance_brand, fragrance_image, battle_month, win_count, updated_at)
  VALUES (p_name, p_brand, p_image, p_month, 1, now())
  ON CONFLICT (fragrance_name, fragrance_brand, battle_month)
  DO UPDATE SET
    win_count = fragrance_leaderboard.win_count + 1,
    updated_at = now();
END;
$$;