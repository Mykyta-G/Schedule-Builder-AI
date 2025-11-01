import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

/**
 * Initialize and return the Supabase client
 * This function fetches the config from Electron's main process
 */
export async function getSupabaseClient() {
  // If already initialized, return it
  if (supabaseClient) {
    return supabaseClient;
  }

  // Get config from Electron main process
  const config = await window.api.getSupabaseConfig();
  
  if (!config.url || !config.anonKey) {
    throw new Error('Supabase configuration is missing. Please check your .env file.');
  }

  // Create and cache the Supabase client
  supabaseClient = createClient(config.url, config.anonKey);
  return supabaseClient;
}

/**
 * Example function to test Supabase connection
 */
export async function testSupabaseConnection() {
  try {
    const supabase = await getSupabaseClient();
    // You can test the connection by listing tables or running a simple query
    // Example: const { data, error } = await supabase.from('your_table').select('*').limit(1);
    return { success: true, message: 'Supabase client initialized successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

