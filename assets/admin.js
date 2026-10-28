(() => {
  const SF = window.SF, db = window.SFDB;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const plain = html => String(html || "").replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const TYPES = { concept: "Concept", scenario: "Scenario", code: "Write code", output: "Output / bug", design: "Design" };
  const LEVELS = ["Basic", "Mid", "Senior"];
  const topicName = id => (SF.topics.find(t => t.id === id) || { name: id }).name;

  let user = null, items = [], current = null, draft = null, dirty = false, pendingOpen = null;

  // ======================= access gate =======================
  function gate(html) { $("gate").innerHTML = html; $("gate").hidden = false; $("workspace").hidden = true; }

  if (!db) {
    gate('<div class="card"><h2>Connect Supabase first</h2><p>The admin page saves questions to your Supabase database. ' +
      'Fill in <code>assets/config.js</code> and run <code>supabase/schema.sql</code>, as described in README sections 3 and 4.</p></div>');
    return;
  }

  function accountBar() {
    $("account").innerHTML = user
      ? '<span class="who">' + esc(user.email || user.id) + '</span><a class="btn" href="./">View site</a><button class="btn" type="button" id="signout">Sign out</button>'
      : '<a class="btn" href="./">View site</a>';
    if (user) $("signout").onclick = async () => { await db.auth.signOut(); };
  }

  function signInCard() {
    const providers = (window.SF_CONFIG.oauthProviders || []).map(p =>
      '<button class="btn" type="button" data-oauth="' + esc(p) + '">Continue with ' + esc(p[0].toUpperCase() + p.slice(1)) + "</button>").join("");
    gate('<form class="card" id="signin-form"><h2>Admin sign-in</h2><p>Sign in with an account that has been added as an admin.</p>' +
      '<label for="si-email">Email</label><input id="si-email" type="email" required autocomplete="email" placeholder="you@example.com">' +
      '<button class="btn primary" type="submit">Email me a sign-in link</button>' + (providers ? '<div class="side-row">' + providers + "</div>" : "") +
      '<p class="status-msg" id="si-msg" role="status"></p></form>');
    $("signin-form").addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("si-email").value.trim();
      $("si-msg").textContent = "Sending…";
      const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      $("si-msg").textContent = error ? error.message : "Check " + email + " for the sign-in link.";
    });
    $("gate").querySelectorAll("[data-oauth]").forEach(b => b.addEventListener("click", () =>
      db.auth.signInWithOAuth({ provider: b.dataset.oauth, options: { redirectTo: location.origin + location.pathname } })));
  }

  function notAdminCard() {
    const sql = "insert into public.admins (user_id) values ('" + user.id + "');";
    gate('<div class="card"><h2>This account isn\'t an admin</h2><p>You are signed in as <b>' + esc(user.email || user.id) + '</b>. ' +
      'To make this account an admin, the project owner runs this once in Supabase → SQL Editor:</p><pre id="grant-sql">' + esc(sql) + '</pre>' +
      '<div class="side-row"><button class="btn" type="button" id="copy-sql">Copy SQL</button><button class="btn" type="button" id="recheck">I\'ve done it, check again</button></div></div>');
    $("copy-sql").onclick = e => copy(sql, e.target, "Copy SQL");
    $("recheck").onclick = () => onSession(user);
  }

  async function onSession(u) {
    user = u || null;
    accountBar();
    if (!user) { signInCard(); return; }
    gate('<p class="empty">Checking admin access…</p>');
    const { data, error } = await db.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (error) { gate('<div class="card"><h2>Couldn\'t check access</h2><p>' + esc(error.message) + '</p><p>Has <code>supabase/schema.sql</code> been run in this project?</p></div>'); return; }
    if (!data) { notAdminCard(); return; }
    $("gate").hidden = true; $("workspace").hidden = false;
    await reload();
  }

  db.auth.getSession().then(({ data }) => onSession(data.session && data.session.user));
  db.auth.onAuthStateChange((event, session) => {
    const u = session && session.user;
    if ((u && (!user || u.id !== user.id)) || (!u && user)) onSession(u);
  });

  // ======================= data =======================
  async function reload(keepId) {
    try { SF.edits = new Map((await SF.fetchEdits()).map(r => [r.id, r])); }
    catch (e) { setMsg("Couldn't load saved edits: " + (e.message || e), "err"); }
    build();
    renderList();
    if (keepId) open(keepId, true);
  }

  function build() {
    const baseIds = new Set();
    items = SF.base.map(q => {
      baseIds.add(q.id);
      return { id: q.id, topic: q.topic, level: q.level, type: q.type, question: q.q, answer: q.a,
        clouds: Array.isArray(q.cloudOverride) ? q.cloudOverride : null, isBase: true, state: "original" };
    });
    const idx = new Map(items.map((it, i) => [it.id, i]));
    SF.edits.forEach(r => {
      const it = { id: r.id, topic: r.topic, level: r.level, type: r.type, question: r.question, answer: r.answer,
        clouds: Array.isArray(r.clouds) && r.clouds.length ? r.clouds : null, isBase: baseIds.has(r.id),
        state: r.deleted ? "deleted" : (baseIds.has(r.id) ? "edited" : "new"), updatedAt: r.updated_at };
      if (idx.has(r.id)) items[idx.get(r.id)] = it; else items.push(it);
    });
  }

  function nextId(topic) {
    let max = 0;
    items.forEach(it => {
      const m = it.id.match(/^([a-z]+)-(\d+)$/);
      if (m && m[1] === topic) max = Math.max(max, parseInt(m[2], 10));
    });
    return topic + "-" + String(Math.max(max + 1, 1)).padStart(3, "0");
  }

  // ======================= list =======================
  const topicSel = $("f-topic");
  SF.groups.forEach(g => {
    const og = document.createElement("optgroup"); og.label = g.name;
    SF.topics.filter(t => t.group === g.id).forEach(t => og.appendChild(new Option(t.name, t.id)));
    topicSel.appendChild(og);
  });
  ["search", "f-topic", "f-state"].forEach(id => $(id).addEventListener("input", renderList));

  function renderList() {
    const term = $("search").value.trim().toLowerCase(), topic = $("f-topic").value, st = $("f-state").value;
    const list = items.filter(it =>
      (!topic || it.topic === topic) && (!st || it.state === st) &&
      (!term || (it.id + " " + plain(it.question)).toLowerCase().includes(term)));
    const edits = items.filter(i => i.state !== "original").length;
    $("side-count").textContent = list.length + " of " + items.length + " questions · " + edits + " with saved edits";
    $("qlist").innerHTML = list.map(it =>
      '<li><button type="button" class="qitem' + (it.state === "deleted" ? " is-deleted" : "") + '" data-id="' + esc(it.id) + '"' +
      (current && current.id === it.id ? ' aria-current="true"' : "") + '>' +
      '<span class="qid">' + esc(it.id) + (it.state !== "original" ? ' <span class="badge ' + it.state + '">' + (it.state === "new" ? "added" : it.state) + "</span>" : "") + "</span>" +
      '<span class="qtxt">' + esc(plain(it.question)) + "</span></button></li>").join("") ||
      '<li class="empty">No questions match.</li>';
  }
  $("qlist").addEventListener("click", e => { const b = e.target.closest(".qitem"); if (b) requestOpen(b.dataset.id); });
  $("new-q").addEventListener("click", () => requestOpen(null));

  // ======================= editor =======================
  function requestOpen(id) {
    if (dirty) { pendingOpen = id; showDiscardPrompt(); return; }
    open(id);
  }

  function open(id, quiet) {
    dirty = false;
    if (id === null) {
      const topic = $("f-topic").value || "apex";
      current = null;
      draft = { isNew: true, id: nextId(topic), topic, level: "Mid", type: "concept", question: "", answer: "", clouds: null, state: "new" };
    } else {
      current = items.find(it => it.id === id);
      if (!current) return;
      draft = { ...current, clouds: current.clouds ? [...current.clouds] : null, isNew: false };
    }
    renderEditor();
    renderList();
    if (!quiet && window.matchMedia("(max-width: 900px)").matches) $("editor").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderEditor() {
    const d = draft;
    const topicOpts = SF.groups.map(g => '<optgroup label="' + esc(g.name) + '">' +
      SF.topics.filter(t => t.group === g.id).map(t => '<option value="' + t.id + '"' + (t.id === d.topic ? " selected" : "") + ">" + esc(t.name) + "</option>").join("") +
      "</optgroup>").join("");
    const opt = (vals, sel) => vals.map(([v, l]) => '<option value="' + v + '"' + (v === sel ? " selected" : "") + ">" + l + "</option>").join("");
    const auto = SF.autoClouds({ q: d.question, topic: d.topic }).map(c => SF.clouds.find(x => x.id === c).name).join(", ");
    const stateLabel = d.isNew ? "New question" : { original: "Original", edited: "Edited", new: "Added", deleted: "Deleted" }[d.state];

    $("editor").innerHTML =
      '<div id="ed-prompt"></div>' +
      '<div class="ed-head"><h2>' + (d.isNew ? "New question" : "Edit question") + ' <code>' + esc(d.id) + "</code>" +
        (!d.isNew && d.state !== "original" ? ' <span class="badge ' + d.state + '">' + (d.state === "new" ? "added" : d.state) + "</span>" : "") + "</h2>" +
        '<span class="side-count">' + esc(stateLabel) + (d.updatedAt ? " · saved " + new Date(d.updatedAt).toLocaleString() : "") + "</span></div>" +
      (d.state === "deleted" ? '<div class="confirm warn">This question is hidden from the site. Restore it to show it again.</div>' : "") +
      '<div class="grid3">' +
        '<label class="field"><span>Topic</span><select id="ed-topic">' + topicOpts + "</select></label>" +
        '<label class="field"><span>Level</span><select id="ed-level">' + opt(LEVELS.map(l => [l, l]), d.level) + "</select></label>" +
        '<label class="field"><span>Type</span><select id="ed-type">' + opt(Object.entries(TYPES), d.type) + "</select></label>" +
      "</div>" +
      '<fieldset class="field"><legend>Cloud</legend><div class="clouds">' +
        SF.clouds.map(c => '<label><input type="checkbox" class="ed-cloud" value="' + c.id + '"' + (d.clouds && d.clouds.includes(c.id) ? " checked" : "") + "> " + esc(c.name) + "</label>").join("") +
        '</div><small id="ed-auto">' + (d.clouds ? "Set by hand." : "None ticked: tagged automatically as " + esc(auto) + ".") + "</small></fieldset>" +
      '<label class="field"><span>Question</span><textarea id="ed-q" rows="3" spellcheck="true">' + esc(d.question) + '</textarea><small>Plain text, or HTML such as &lt;code&gt; and &lt;pre&gt;&lt;code&gt;.</small></label>' +
      '<div class="split">' +
        '<div class="field"><span>Answer (HTML)</span>' +
          '<div class="toolbar" role="toolbar" aria-label="Answer formatting">' +
            '<button type="button" data-fmt="p">Paragraph</button><button type="button" data-fmt="ul">Bullets</button>' +
            '<button type="button" data-fmt="pre">Code block</button><button type="button" data-fmt="code">Inline code</button>' +
            '<button type="button" data-fmt="b">Bold</button><button type="button" data-fmt="tip">Tip box</button>' +
            '<button type="button" data-fmt="escape">Escape &lt; &gt;</button></div>' +
          '<textarea id="ed-a" spellcheck="false">' + esc(d.answer) + "</textarea>" +
          "<small>Select text, then a button. Code block and Inline code also escape &lt; and &gt; in the selection.</small></div>" +
        '<div class="field"><span>Preview</span><div class="preview" id="ed-preview"></div></div>' +
      "</div>" +
      '<div class="actions-bar">' +
        '<button class="btn primary" type="button" id="ed-save">' + (d.isNew ? "Add question" : "Save changes") + "</button>" +
        '<button class="btn" type="button" id="ed-discard" disabled>Discard changes</button>' +
        '<span class="spacer"></span>' +
        (!d.isNew ? '<button class="btn" type="button" id="ed-copyrow">Copy as data row</button>' : "") +
        (!d.isNew && d.state === "deleted" ? '<button class="btn" type="button" id="ed-restore">Restore</button>' : "") +
        (!d.isNew && d.state !== "deleted" ? '<button class="btn danger" type="button" id="ed-delete">Delete</button>' : "") +
        (!d.isNew && d.isBase && d.state !== "original" ? '<button class="btn" type="button" id="ed-revert">Revert to original</button>' : "") +
      "</div>" +
      '<div id="ed-confirm"></div>' +
      '<p class="status-msg" id="ed-msg" role="status"></p>' +
      (!d.isNew ? '<details class="history" id="ed-history"><summary>Version history</summary><p class="side-count">Loading…</p></details>' : "");

    wireEditor();
    preview();
  }

  function wireEditor() {
    const markDirty = () => { dirty = true; $("ed-discard").disabled = false; };
    $("ed-topic").addEventListener("change", e => {
      draft.topic = e.target.value;
      if (draft.isNew) { draft.id = nextId(draft.topic); $("editor").querySelector(".ed-head code").textContent = draft.id; }
      markDirty(); updateAuto();
    });
    $("ed-level").addEventListener("change", e => { draft.level = e.target.value; markDirty(); });
    $("ed-type").addEventListener("change", e => { draft.type = e.target.value; markDirty(); });
    $("editor").querySelectorAll(".ed-cloud").forEach(c => c.addEventListener("change", () => {
      const sel = [...$("editor").querySelectorAll(".ed-cloud:checked")].map(x => x.value);
      draft.clouds = sel.length ? sel : null; markDirty(); updateAuto();
    }));
    let t;
    ["ed-q", "ed-a"].forEach(id => $(id).addEventListener("input", e => {
      draft[id === "ed-q" ? "question" : "answer"] = e.target.value; markDirty();
      clearTimeout(t); t = setTimeout(() => { preview(); updateAuto(); }, 150);
    }));
    $("editor").querySelector(".toolbar").addEventListener("click", e => { const b = e.target.closest("[data-fmt]"); if (b) format(b.dataset.fmt); });
    $("ed-save").onclick = save;
    $("ed-discard").onclick = () => open(draft.isNew ? null : draft.id);
    if ($("ed-delete")) $("ed-delete").onclick = () => confirmBox("Hide <b>" + esc(draft.id) + "</b> from the site? It stays in the database and you can restore it later.", "Delete", () => setDeleted(true));
    if ($("ed-restore")) $("ed-restore").onclick = () => setDeleted(false);
    if ($("ed-revert")) $("ed-revert").onclick = () => confirmBox("Remove your edits and go back to the built-in version of <b>" + esc(draft.id) + "</b>? Your edited version is kept in version history.", "Revert", revert);
    if ($("ed-copyrow")) $("ed-copyrow").onclick = e => copyRow(e.target);
    if (!draft.isNew) loadHistory();
  }

  function updateAuto() {
    const el = $("ed-auto"); if (!el) return;
    if (draft.clouds) { el.textContent = "Set by hand."; return; }
    el.textContent = "None ticked: tagged automatically as " +
      SF.autoClouds({ q: draft.question, topic: draft.topic }).map(c => SF.clouds.find(x => x.id === c).name).join(", ") + ".";
  }

  function preview() {
    $("ed-preview").innerHTML = '<div class="pv-q qt">' + SF.sanitize(draft.question || "<i>Question</i>") + '</div><div class="ans">' + SF.sanitize(draft.answer || "<p><i>Answer</i></p>") + "</div>";
  }

  // ---- formatting toolbar ----
  const escHtml = s => s.replace(/&(?!(lt|gt|amp|quot);)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function format(kind) {
    const ta = $("ed-a"), s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
    let out;
    switch (kind) {
      case "p": out = "<p>" + (sel || "Text") + "</p>"; break;
      case "ul": out = "<ul>\n" + (sel || "Point").split(/\n+/).filter(Boolean).map(l => "  <li>" + l.replace(/^[-*•]\s*/, "") + "</li>").join("\n") + "\n</ul>"; break;
      case "pre": out = "<pre><code>" + escHtml(sel || "// code") + "</code></pre>"; break;
      case "code": out = "<code>" + escHtml(sel || "code") + "</code>"; break;
      case "b": out = "<b>" + (sel || "bold") + "</b>"; break;
      case "tip": out = '<p class="tip">' + (sel || "Tip") + "</p>"; break;
      case "escape": out = escHtml(sel); break;
    }
    ta.setRangeText(out, s, e, "end");
    ta.focus();
    ta.dispatchEvent(new Event("input"));
  }

  // ---- save / delete / restore / revert ----
  function validate() {
    if (!/^[a-z]+-\d{3,}$/.test(draft.id)) return "The id must look like apex-201.";
    if (plain(draft.question).length < 5) return "Write the question (at least 5 characters).";
    if (!plain(draft.answer).length) return "Write the answer.";
    if (draft.isNew && items.some(i => i.id === draft.id)) return "Id " + draft.id + " already exists. Change the topic and back to get a new id.";
    return null;
  }
  const rowOf = (deleted) => ({
    id: draft.id, topic: draft.topic, level: draft.level, type: draft.type,
    question: draft.question.trim(), answer: draft.answer.trim(), clouds: draft.clouds, deleted
  });

  async function save() {
    const problem = validate();
    if (problem) { setMsg(problem, "err"); return; }
    busy(true); setMsg("Saving…");
    const { error } = await db.from("questions").upsert(rowOf(draft.state === "deleted"), { onConflict: "id" });
    busy(false);
    if (error) { setMsg(friendly(error), "err"); return; }
    const id = draft.id, wasNew = draft.isNew;
    dirty = false;
    await reload(id);
    setMsg((wasNew ? "Added. " : "Saved. ") + "It's live on the site for new visitors.", "ok");
  }

  async function setDeleted(flag) {
    busy(true); setMsg(flag ? "Deleting…" : "Restoring…");
    const { error } = await db.from("questions").upsert(rowOf(flag), { onConflict: "id" });
    busy(false);
    if (error) { setMsg(friendly(error), "err"); return; }
    dirty = false;
    await reload(draft.id);
    setMsg(flag ? "Deleted. It's hidden from the site; Restore brings it back." : "Restored. It's visible on the site again.", "ok");
  }

  async function revert() {
    busy(true); setMsg("Reverting…");
    const { error } = await db.from("questions").delete().eq("id", draft.id);
    busy(false);
    if (error) { setMsg(friendly(error), "err"); return; }
    dirty = false;
    await reload(draft.id);
    setMsg("Reverted to the built-in version.", "ok");
  }

  function friendly(err) {
    const m = err.message || String(err);
    if (/row-level security|permission denied/i.test(m)) return "Not allowed: this account isn't an admin in the database.";
    if (/duplicate key/i.test(m)) return "That id already exists.";
    if (/violates check constraint/i.test(m)) return "The database rejected a value (check id format, level, type and lengths). " + m;
    return "Couldn't save: " + m;
  }

  // ---- history ----
  async function loadHistory() {
    const box = $("ed-history"); if (!box) return;
    const id = draft.id;
    const { data, error } = await db.from("question_history")
      .select("history_id,topic,level,type,question,answer,clouds,deleted,action,changed_at")
      .eq("id", id).order("changed_at", { ascending: false }).limit(20);
    if (!box.isConnected || draft.id !== id) return;
    const body = error ? '<p class="side-count">Couldn\'t load history: ' + esc(error.message) + "</p>"
      : !data || !data.length ? '<p class="side-count">No earlier saved versions. ' + (draft.isBase ? "The built-in version is always available through Revert." : "") + "</p>"
      : "<ul>" + data.map((h, i) => '<li><span><time>' + esc(new Date(h.changed_at).toLocaleString()) + "</time> · before " + esc(h.action) +
          (h.deleted ? " (was deleted)" : "") + '</span><button class="btn" type="button" data-h="' + i + '">Load into editor</button></li>').join("") + "</ul>";
    box.innerHTML = "<summary>Version history" + (data && data.length ? " (" + data.length + ")" : "") + "</summary>" + body;
    box.querySelectorAll("[data-h]").forEach(b => b.addEventListener("click", () => {
      const h = data[+b.dataset.h];
      Object.assign(draft, { topic: h.topic, level: h.level, type: h.type, question: h.question, answer: h.answer,
        clouds: Array.isArray(h.clouds) && h.clouds.length ? h.clouds : null });
      renderEditor(); dirty = true; $("ed-discard").disabled = false;
      setMsg("Loaded the version from " + new Date(h.changed_at).toLocaleString() + ". Review it, then Save changes to publish it.");
    }));
  }

  // ---- small UI helpers ----
  function setMsg(text, kind) { const el = $("ed-msg"); if (!el) return; el.textContent = text; el.className = "status-msg" + (kind ? " " + kind : ""); }
  function busy(on) { $("editor").querySelectorAll(".actions-bar button").forEach(b => { b.disabled = on || (b.id === "ed-discard" && !dirty); }); }
  function confirmBox(html, label, onYes) {
    const box = $("ed-confirm");
    box.innerHTML = '<div class="confirm"><span>' + html + '</span><button class="btn danger" type="button" id="cf-yes">' + label +
      '</button><button class="btn" type="button" id="cf-no">Cancel</button></div>';
    $("cf-yes").onclick = () => { box.innerHTML = ""; onYes(); };
    $("cf-no").onclick = () => { box.innerHTML = ""; };
    $("cf-yes").focus();
  }
  function showDiscardPrompt() {
    const box = $("ed-prompt"); if (!box) return;
    box.innerHTML = '<div class="confirm warn"><span>You have unsaved changes to <b>' + esc(draft.id) + "</b>.</span>" +
      '<button class="btn" type="button" id="dp-keep">Keep editing</button><button class="btn danger" type="button" id="dp-discard">Discard and continue</button></div>';
    $("dp-keep").onclick = () => { box.innerHTML = ""; pendingOpen = undefined; };
    $("dp-discard").onclick = () => { dirty = false; const id = pendingOpen; pendingOpen = undefined; open(id); };
    box.scrollIntoView({ block: "nearest" });
  }
  function copy(text, btn, label) {
    const done = ok => { btn.textContent = ok ? "Copied" : "Select and copy manually"; setTimeout(() => (btn.textContent = label), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); else done(false);
  }
  function copyRow(btn) {
    const bad = s => /`|\$\{/.test(s);
    if (bad(draft.question) || bad(draft.answer)) { setMsg("The text contains a backtick or ${, which can't go into a data file as is. Replace them first.", "err"); return; }
    const row = "[" + JSON.stringify(draft.id) + "," + JSON.stringify(draft.level) + "," + JSON.stringify(draft.type) + ",`" + draft.question + "`,\n`" + draft.answer + "`" +
      (draft.clouds ? "," + JSON.stringify(draft.clouds) : "") + "],";
    copy(row, btn, "Copy as data row");
    setMsg("Copied. Paste it into data/" + draft.topic + ".js to make this edit part of the repository.", "ok");
  }

  // ---- export ----
  $("export").addEventListener("click", async e => {
    const btn = e.target; btn.disabled = true;
    try {
      const rows = await SF.fetchEdits();
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "question-edits-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (err) { setMsg("Export failed: " + (err.message || err), "err"); }
    btn.disabled = false;
  });

  // ---- keyboard + leave guard ----
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && draft && !$("workspace").hidden) { e.preventDefault(); save(); }
  });
  window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
})();
