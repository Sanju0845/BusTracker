import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project URL and anon key
const supabaseUrl = 'https://shybpwhhuwqycijlaknd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoeWJwd2hodXdxeWNpamxha25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNjU2MjUsImV4cCI6MjA2MDc0MTYyNX0.YMfDMVW_8H4SYgNJn_Iws8F-TNRYAxXCEcERU_LYvEo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 