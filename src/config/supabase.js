const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// Polyfill globally just in case other parts of Supabase depend on it
global.WebSocket = WebSocket;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Create a single supabase client for interacting with your database
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
      transport: WebSocket,
    }
  });
} else {
  console.warn('Supabase URL or Key is missing. Supabase client is not initialized.');
}

module.exports = supabase;
