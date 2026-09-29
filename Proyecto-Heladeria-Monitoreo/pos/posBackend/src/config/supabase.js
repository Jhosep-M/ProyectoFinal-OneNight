const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

const supabaseAnon = env.supabaseUrl && env.supabaseAnonKey ? createClient(env.supabaseUrl, env.supabaseAnonKey) : null;
const supabaseService = env.supabaseUrl && env.supabaseServiceRoleKey ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey) : null;

module.exports = { supabaseAnon, supabaseService };
