import { createClient } from '@supabase/supabase-js'
// Production ready Code
// You can use this code to connect your React app to a Supabase database.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// This creates the connection object that your app will use to talk to the database.
export const supabase = createClient(supabaseUrl, supabaseKey)