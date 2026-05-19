import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

export const SUPABASE_URL = "https://moazswfklpvoperkarlk.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYXpzd2ZrbHB2b3BlcmthcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc2MTYsImV4cCI6MjA3OTI4MzYxNn0.7_xrCWwV_elxQ0i4bdQ9Hsv-HGB-qz30a__1aeJ4QiM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);