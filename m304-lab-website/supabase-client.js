(() => {
  const config = window.M304_SUPABASE_CONFIG || {};
  const isConfigured = Boolean(config.url && config.anonKey && window.supabase);
  window.m304SupabaseConfigured = isConfigured;
  window.m304Supabase = isConfigured
    ? window.supabase.createClient(config.url, config.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;
})();
