// supabase.js - Supabase client setup

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://wabhaplvnkezztqvbqqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmhhcGx2bmtlenp0cXZicXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjkzMjgsImV4cCI6MjA4MDc0NTMyOH0.yRJowwqsrS76v7aYMhIX117heRN6BZeCjIiIYp6RRE4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);