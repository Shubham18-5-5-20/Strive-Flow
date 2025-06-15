import { createClient } from '@supabase/supabase-js'

// Replace the placeholder strings with your actual credentials.
const supabaseUrl = 'https://iehorqrsbbpycqdjipap.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllaG9ycXJzYmJweWNxZGppcGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODAxNTgsImV4cCI6MjA2NTU1NjE1OH0.9hVB1u20N1oKZN2Q3dzxOwxMBVwVlKWB5mxsWoKjzhU'

// This creates the connection object that your app will use to talk to the database.
export const supabase = createClient(supabaseUrl, supabaseKey)