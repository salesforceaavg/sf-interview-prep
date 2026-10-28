/*
 * Progress store.
 *
 * Signed out  -> marks live in localStorage under "sfprep:guest".
 * Signed in   -> marks live in Supabase table user_progress, with a local
 *                cache under "sfprep:user:<id>" so the page works offline.
 * On sign-in  -> guest marks are merged into the account (newest change wins
 *                per question), pushed to the server, then the guest copy is cleared.
 * On sign-out -> the account cache is removed from this browser and the
 *                visitor continues as a guest.
 *
 * Each mark is { s: "review" | "done" | "none", u: <epoch ms of last change> }.
 * "none" is kept (not deleted) so a cleared mark on one device wins over an
 * older mark on another device.
 */
window.Progress = (() => {
  const GUEST = "sfprep:guest";
  let key = GUEST, data = {}, user = null, client = null;
  let syncState = "local";               // local | syncing | synced | error
  const pending = new Map();
  let timer = null;
  const listeners = new Set();

  const read = k => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch (e) { return {}; } };
  const write = () => { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {} };
  const drop = k => { try { localStorage.removeItem(k); } catch (e) {} };
  const emit = () => listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  const setSync = s => { syncState = s; emit(); };

  data = read(GUEST);

  function status(id) { return (data[id] && data[id].s) || "none"; }

  function set(id, s) {
    data[id] = { s, u: Date.now() };
    write();
    if (user) { pending.set(id, data[id]); schedule(); }
    emit();
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(flush, 700); }

  async function flush() {
    if (!user || !client || pending.size === 0) return;
    const rows = [...pending].map(([id, v]) => ({
      user_id: user.id, question_id: id, status: v.s, updated_at: new Date(v.u).toISOString()
    }));
    pending.clear();
    setSync("syncing");
    const { error } = await client.from("user_progress").upsert(rows, { onConflict: "user_id,question_id" });
    if (error) {
      console.error("Progress sync failed", error);
      rows.forEach(r => { if (!pending.has(r.question_id)) pending.set(r.question_id, { s: r.status, u: Date.parse(r.updated_at) }); });
      setSync("error");
      clearTimeout(timer); timer = setTimeout(flush, 10000);   // retry later
    } else setSync("synced");
  }

  async function signedIn(u) {
    if (user && user.id === u.id) return;
    user = u;
    key = "sfprep:user:" + u.id;
    setSync("syncing");
    const cached = read(key), guest = read(GUEST);
    const { data: rows, error } = await client.from("user_progress").select("question_id,status,updated_at");
    if (error) { console.error(error); data = { ...cached }; setSync("error"); return; }

    const remote = {};
    (rows || []).forEach(r => { remote[r.question_id] = { s: r.status, u: Date.parse(r.updated_at) }; });
    const merged = { ...remote };
    [cached, guest].forEach(src => {
      Object.entries(src).forEach(([id, v]) => { if (!merged[id] || v.u > merged[id].u) merged[id] = v; });
    });
    data = merged; write();
    Object.entries(merged).forEach(([id, v]) => { if (!remote[id] || v.u > remote[id].u) pending.set(id, v); });
    drop(GUEST);
    if (pending.size) await flush(); else setSync("synced");
  }

  function signedOut() {
    if (user) drop(key);
    user = null; key = GUEST; data = read(GUEST); pending.clear();
    setSync("local");
  }

  // ---------- auth ----------
  const enabled = !!window.SFDB;
  if (enabled) {
    client = window.SFDB;
    client.auth.getSession().then(({ data: d }) => { if (d.session) signedIn(d.session.user); });
    client.auth.onAuthStateChange((event, session) => {
      if (session && session.user) signedIn(session.user);
      else if (event === "SIGNED_OUT") signedOut();
    });
    window.addEventListener("online", () => { if (pending.size) flush(); });
  }

  const redirect = () => location.origin + location.pathname;

  return {
    enabled,
    status,
    set,
    all: () => data,
    user: () => user,
    sync: () => syncState,
    onChange: fn => listeners.add(fn),
    async sendLink(email) {
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } });
      return error;
    },
    async oauth(provider) {
      const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: redirect() } });
      return error;
    },
    async signOut() { await flush(); await client.auth.signOut(); signedOut(); }
  };
})();
