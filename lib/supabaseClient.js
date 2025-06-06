import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vgtkzfhvjwtxeohhkesp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGt6Zmh2and0eGVvaGhrZXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxODk5MDksImV4cCI6MjA2NDc2NTkwOX0.TQ058pLeC_ff-PFFnOOkDcDq8w0Gw4ahtOLS3LgIPUs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 
