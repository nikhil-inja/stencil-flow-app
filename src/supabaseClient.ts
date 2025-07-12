// src/supabaseClient.ts

import { createClient } from '@supabase/supabase-js'

// Replace 'YOUR_SUPABASE_URL' and 'YOUR_SUPABASE_ANON_KEY' with your actual Supabase project URL and anon key.
const supabaseUrl = 'https://sdelxalkldktjcxjqigt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZWx4YWxrbGRrdGpjeGpxaWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxOTcyMjMsImV4cCI6MjA2Nzc3MzIyM30.sa6oL_LAseNHEVPBzrXg0qhwlSEqHmK-AQQCjrGq6Jo'

// This creates a single Supabase client instance that we can import and use anywhere in our app.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)