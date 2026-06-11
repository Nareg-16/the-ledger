/* ============================================================
   sync.js — optional Supabase cloud sync (plain JS, no JSX)
   The app works fully without this; everything here no-ops
   unless supabase-config.js is filled in and the CDN loaded.
   ============================================================ */
(function () {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  const enabled = !!(url && key && window.supabase);
  const client = enabled ? window.supabase.createClient(url, key) : null;

  async function syncGetSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session || null;
  }

  /* cb(session|null) on every auth change; returns unsubscribe fn */
  function syncOnAuth(cb) {
    if (!client) return () => {};
    const { data } = client.auth.onAuthStateChange((_event, session) => cb(session));
    return () => data.subscription.unsubscribe();
  }

  /* passwordless: emails the user a one-tap login link */
  async function syncSignInEmail(email) {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function syncSignOut() {
    if (client) await client.auth.signOut();
  }

  /* Returns { data, updated_at } or null when the user has no row yet */
  async function cloudPull() {
    const session = await syncGetSession();
    if (!session) return null;
    const { data, error } = await client
      .from("ledgers").select("data, updated_at")
      .eq("user_id", session.user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  /* payload is either the plain state object or an encrypted {enc:true,...} blob */
  async function cloudPush(payload, updatedAtISO) {
    const session = await syncGetSession();
    if (!session) return;
    const { error } = await client.from("ledgers").upsert({
      user_id: session.user.id,
      data: payload,
      updated_at: updatedAtISO || new Date().toISOString(),
    });
    if (error) throw error;
  }

  Object.assign(window, {
    syncEnabled: enabled,
    syncGetSession, syncOnAuth, syncSignInEmail, syncSignOut,
    cloudPull, cloudPush,
  });
})();
