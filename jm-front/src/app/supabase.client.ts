// src/app/supabase.client.ts
import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

// Validate environment variables
if (!environment.supabaseUrl) {
  throw new Error('Missing Supabase URL in environment configuration');
}

if (!environment.supabaseAnonKey) {
  throw new Error('Missing Supabase Anon Key in environment configuration');
}

export const supabase = createClient(
  environment.supabaseUrl,
  environment.supabaseAnonKey,
  {
    auth: {
      persistSession: false // we don't have authentication yet
    }
  }
);