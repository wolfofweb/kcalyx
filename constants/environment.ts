/**
 * Environment variables configuration.
 * Using EXPO_PUBLIC_ prefix allows Expo to automatically load these from .env file
 * in SDK 49+.
 */
export const ENV = {
  OPENROUTER_API_KEY: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
};
