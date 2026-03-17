import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://mkcsovjnjjjvnraejvrf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rY3Nvdmpuampqdm5yYWVqdnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTcyMDksImV4cCI6MjA4OTI3MzIwOX0.wNjkszm4RJ4TnlCgvDylPykoqSJo8odgT481r1obtcI'
)
