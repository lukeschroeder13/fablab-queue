import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://hmmupywbfyfynaifemns.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbXVweXdiZnlmeW5haWZlbW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTgwNTIsImV4cCI6MjA5MzQ5NDA1Mn0.vI2GX8JKiJuSprsqhQFiz5GYgvTpQNf2K5zrHw9Kc0g'
)
