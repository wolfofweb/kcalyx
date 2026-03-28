import CryptoJS from 'crypto-js';
import { supabase } from './supabase';
import { ENV } from '../constants/environment';

// A fallback key if one isn't provided in environment (should be properly secured in production)
const SECRET_KEY = ENV.ENCRYPTION_SECRET_KEY || 'kcalyx-secure-vault-2024';

/**
 * Encrypts a string using AES.
 * @param {string} text - The raw API key.
 * @returns {string} The encrypted ciphertext.
 */
export const encryptKey = (text) => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

/**
 * Decrypts a ciphertext using AES.
 * @param {string} ciphertext - The encrypted string from Supabase.
 * @returns {string} The original decrypted key.
 */
export const decryptKey = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Saves the encrypted API key to the user's Supabase profile.
 * @param {string} userId - The Supabase user ID.
 * @param {string} apiKey - The raw API key to encrypt and save.
 */
export const saveApiKey = async (userId, apiKey) => {
  if (!userId || !apiKey) return { error: 'Missing userId or apiKey' };

  try {
    const encrypted = encryptKey(apiKey);
    const { data, error } = await supabase
      .from('profiles')
      .update({ openrouter_key: encrypted })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error saving API key:', err);
    return { error: err.message };
  }
};

/**
 * Fetches and decrypts the user's API key from their Supabase profile.
 * @param {string} userId - The Supabase user ID.
 * @returns {Promise<string|null>} The decrypted key or null if not found.
 */
export const getApiKey = async (userId) => {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('openrouter_key')
      .eq('id', userId)
      .single();

    if (error || !data || !data.openrouter_key) return null;

    const decrypted = decryptKey(data.openrouter_key);
    return decrypted || null;
  } catch (err) {
    console.error('Error getting API key:', err);
    return null;
  }
};
