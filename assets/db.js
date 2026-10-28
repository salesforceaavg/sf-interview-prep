// One shared Supabase client for the site and the admin page.
// null when Supabase isn't configured (or the library failed to load):
// the site then runs on the built-in questions with browser-only progress.
window.SFDB = (() => {
  const c = window.SF_CONFIG || {};
  if (!c.supabaseUrl || !c.supabaseAnonKey || !window.supabase || !window.supabase.createClient) return null;
  try { return window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey); }
  catch (e) { console.error("Supabase client failed", e); return null; }
})();
