import { createClient } from '@supabase/supabase-js';

// Access environment variables safely. 
// In Vite/Build environments, import.meta.env is populated.
// In raw browser ESM, it might be undefined.
const env = (import.meta as any).env || {};

// Use environment variables if available, otherwise fallback to provided credentials.
// This ensures the app doesn't crash with "supabaseUrl is required" if env vars aren't set.
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://erwossfpomwukmktjbjr.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wOmihKXCRUAFtornC31kYQ_FRswHaJf';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Thiếu cấu hình Supabase! Hãy kiểm tra file .env hoặc cấu hình deployment.');
}

// Ensure createClient always receives strings to prevent crash
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder'
);