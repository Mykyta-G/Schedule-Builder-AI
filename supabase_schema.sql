-- Supabase Database Schema for Schedule Builder AI
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  room TEXT NOT NULL DEFAULT '',
  teacher TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_blocks_schedule_id ON blocks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON blocks(created_at);
CREATE INDEX IF NOT EXISTS idx_schedules_updated_at ON schedules(updated_at);

-- Enable Row Level Security (RLS) - Adjust policies based on your needs
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your authentication needs)
-- For development: Allow all operations for all users
-- For production: You should create more restrictive policies

-- Policy for schedules: Allow all operations
CREATE POLICY "Allow all operations on schedules" ON schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy for blocks: Allow all operations
CREATE POLICY "Allow all operations on blocks" ON blocks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

