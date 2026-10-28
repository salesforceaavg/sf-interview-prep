(() => {
  const SF = window.SF;
  const P = window.Progress;
  const TYPES = { concept: "Concept", scenario: "Scenario", code: "Write code", output: "Output / bug", design: "Design" };
  const LEVELS = ["Basic", "Mid", "Senior"];
  const STATUSES = { all: "Any progress", none: "Not started", review: "In review", done: "Done" };

  const state = { topic: "all", level: "all", type: "all", status: "all", term: "" };
  const byId = new Map(SF.q.map((q, i) => { q.n = i + 1; return [q.id, q]; }));

  const $ = id => document.getElementById(id);
  const listEl = $("list");

  // ---------- chips ----------
  function chipRow(el, key, items) {
    el.innerHTML = "";
    items.forEach(([val, label, n]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.v = val;
      b.innerHTML = label + (n != null ? '<span class="n">' + n + "</span>" : "");
      b.onclick = () => { state[key] = val; render(); };
      el.appendChild(b);
    });
  }
  const count = fn => SF.q.filter(fn).length;
  chipRow($("chips-topic"), "topic", [["all", "All topics", SF.q.length],
    ...SF.topics.map(t => [t.id, t.name, count(q => q.topic === t.id)])]);
  chipRow($("chips-level"), "level", [["all", "All levels", null], ...LEVELS.map(l => [l, l, count(q => q.level === l)])]);
  chipRow($("chips-type"), "type", [["all", "All types", null], ...Object.entries(TYPES).map(([k, v]) => [k, v, count(q => q.type === k)])]);
  chipRow($("chips-status"), "status", Object.entries(STATUSES).map(([k, v]) => [k, v, null]));

  function syncChips() {
    [["chips-topic", "topic"], ["chips-level", "level"], ["chips-type", "type"], ["chips-status", "status"]].forEach(([id, k]) =>
      $(id).querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.v === state[k]))));
  }

  // ---------- filtering ----------
  const plain = html => html.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  SF.q.forEach(q => { q._text = (q.q + " " + plain(q.a)).toLowerCase(); });

  function matches(q) {
    if (state.topic !== "all" && q.topic !== state.topic) return false;
    if (state.level !== "all" && q.level !== state.level) return false;
    if (state.type !== "all" && q.type !== state.type) return false;
    if (state.status !== "all" && P.status(q.id) !== state.status) return false;
    if (state.term && !state.term.split(/\s+/).every(w => q._text.includes(w))) return false;
    return true;
  }

  // ---------- rendering ----------
  function statusButtons(q) {
    const s = P.status(q.id);
    return '<div class="actions">' +
      '<button type="button" class="mark m-review" data-set="review" aria-pressed="' + (s === "review") + '">' + (s === "review" ? "In review ✓" : "Mark in review") + "</button>" +
      '<button type="button" class="mark m-done" data-set="done" aria-pressed="' + (s === "done") + '">' + (s === "done" ? "Done ✓" : "Mark done") + "</button>" +
      '<button type="button" class="mark" data-copy>Copy link</button></div>';
  }

  function card(q) {
    const d = document.createElement("details");
    const s = P.status(q.id);
    d.className = "qa" + (s !== "none" ? " st-" + s : "");
    d.id = q.id;
    d.innerHTML = '<summary><span class="num">Q' + q.n + '</span><span class="qt">' + q.q + '</span>' +
      '<span class="tags"><span class="typ">' + (TYPES[q.type] || "") + '</span><span class="lvl ' + q.level + '">' + q.level + "</span></span></summary>";
    // answers are built only when opened, keeps 500+ cards light
    d.addEventListener("toggle", () => { if (d.open && !d.querySelector(".ans")) fill(d, q); });
    return d;
  }

  function fill(d, q) {
    const a = document.createElement("div");
    a.className = "ans";
    a.innerHTML = q.a + statusButtons(q);
    a.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.set) {
        const next = P.status(q.id) === b.dataset.set ? "none" : b.dataset.set;
        P.set(q.id, next);
      } else if ("copy" in b.dataset) {
        const url = location.origin + location.pathname + "#" + q.id;
        const done = () => { b.textContent = "Link copied"; setTimeout(() => (b.textContent = "Copy link"), 1500); };
        history.replaceState(null, "", "#" + q.id);   // fallback: the link is now in the address bar
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => { b.textContent = "Link is in the address bar"; });
        else b.textContent = "Link is in the address bar";
      }
    });
    d.appendChild(a);
  }

  function refreshCard(d) {
    const q = byId.get(d.id); if (!q) return;
    const s = P.status(q.id);
    d.className = "qa" + (s !== "none" ? " st-" + s : "");
    const old = d.querySelector(".actions");
    if (old) { const t = document.createElement("div"); t.innerHTML = statusButtons(q); old.replaceWith(t.firstChild); }
  }

  function meter(qs) {
    let done = 0, rev = 0;
    qs.forEach(q => { const s = P.status(q.id); if (s === "done") done++; else if (s === "review") rev++; });
    const pct = n => (qs.length ? (n / qs.length) * 100 : 0).toFixed(1) + "%";
    return '<span class="meter"><span class="track"><span class="d" style="width:' + pct(done) + '"></span><span class="r" style="width:' + pct(rev) + '"></span></span>' +
      done + " done · " + rev + " review</span>";
  }

  function render() {
    syncChips();
    listEl.innerHTML = "";
    let shown = 0;
    SF.topics.forEach(t => {
      if (state.topic !== "all" && state.topic !== t.id) return;
      const all = SF.q.filter(q => q.topic === t.id);
      const items = all.filter(matches);
      if (!items.length) return;
      const sec = document.createElement("section");
      sec.className = "topic"; sec.dataset.topic = t.id;
      sec.innerHTML = '<div class="topic-head"><h2>' + t.name + " <small>" + items.length + (items.length !== all.length ? " of " + all.length : "") +
        "</small></h2>" + meter(all) + "<p>" + t.desc + "</p></div>";
      items.forEach(q => { sec.appendChild(card(q)); shown++; });
      listEl.appendChild(sec);
    });
    if (!shown) listEl.innerHTML = '<p class="empty">No questions match these filters. Clear the search or pick another topic, level or type.</p>';
    stats();
  }

  function stats() {
    const ids = SF.q.map(q => q.id);
    const done = ids.filter(id => P.status(id) === "done").length;
    const rev = ids.filter(id => P.status(id) === "review").length;
    const lv = l => count(q => q.level === l);
    $("stats").innerHTML =
      "<span><b>" + SF.q.length + "</b> questions</span><span><b>" + SF.topics.length + "</b> topics</span>" +
      "<span><b>" + lv("Basic") + "</b> basic · <b>" + lv("Mid") + "</b> mid · <b>" + lv("Senior") + "</b> senior</span>" +
      "<span><b>" + done + "</b> done · <b>" + rev + "</b> in review</span>";
  }

  // ---------- account ----------
  function account() {
    const el = $("account");
    if (!P.enabled) { el.innerHTML = '<span class="sync">Progress saved in this browser</span>'; return; }
    const u = P.user();
    if (!u) {
      el.innerHTML = '<span class="sync">Saved in this browser</span><button class="btn" type="button" id="signin">Sign in to sync</button>';
      $("signin").onclick = () => $("auth-dialog").showModal();
    } else {
      const dlg = $("auth-dialog");
      if (dlg.open) dlg.close();
      const s = P.sync();
      const label = { syncing: "Syncing…", synced: "Synced", error: "Sync failed, retrying", local: "" }[s];
      el.innerHTML = '<span class="who">' + (u.email || "Signed in") + '</span><span class="sync ' + (s === "error" ? "err" : s === "synced" ? "ok" : "") + '">' + label +
        '</span><button class="btn" type="button" id="signout">Sign out</button>';
      $("signout").onclick = () => P.signOut();
    }
  }

  if (P.enabled) {
    const oauth = $("auth-oauth");
    (window.SF_CONFIG.oauthProviders || []).forEach(p => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn";
      b.textContent = "Continue with " + p[0].toUpperCase() + p.slice(1);
      b.onclick = async () => { const err = await P.oauth(p); if (err) $("auth-msg").textContent = err.message; };
      oauth.appendChild(b);
    });
    $("auth-form").addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("auth-email").value.trim();
      $("auth-msg").textContent = "Sending…";
      const err = await P.sendLink(email);
      $("auth-msg").textContent = err ? err.message : "Check " + email + " for a sign-in link. You can close this window.";
    });
    $("auth-close").onclick = () => $("auth-dialog").close();
  }

  // ---------- controls ----------
  let t;
  $("q").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { state.term = e.target.value.trim().toLowerCase(); render(); }, 150); });
  $("expand").onclick = e => {
    const all = [...listEl.querySelectorAll("details")];
    const open = !all.every(d => d.open);
    all.forEach(d => (d.open = open));
    e.target.textContent = open ? "Collapse all" : "Expand all";
  };
  $("random").onclick = () => {
    const pool = SF.q.filter(matches);
    if (!pool.length) return;
    openQuestion(pool[Math.floor(Math.random() * pool.length)].id);
  };

  function openQuestion(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function fromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!byId.has(id)) return;
    const q = byId.get(id);
    if (!matches(q)) { Object.assign(state, { topic: "all", level: "all", type: "all", status: "all", term: "" }); $("q").value = ""; render(); }
    openQuestion(id);
  }
  window.addEventListener("hashchange", fromHash);

  P.onChange(() => {
    account();
    if (state.status !== "all") render();
    else { listEl.querySelectorAll("details.qa").forEach(refreshCard); listEl.querySelectorAll("section.topic").forEach(sec => {
      const m = sec.querySelector(".meter"); if (m) m.outerHTML = meter(SF.q.filter(q => q.topic === sec.dataset.topic)); }); stats(); }
  });

  render();
  account();
  fromHash();
})();
