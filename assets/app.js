(async () => {
  const SF = window.SF;
  const P = window.Progress;
  await SF.ready;                      // admin edits from the database, if any
  SF.q.forEach(SF.tagClouds);
  const TYPES = { concept: "Concept", scenario: "Scenario", code: "Write code", output: "Output / bug", design: "Design" };
  const LEVELS = ["Basic", "Mid", "Senior"];
  const STATUSES = { none: "Not started", review: "In review", done: "Done" };
  const CLOUD = Object.fromEntries(SF.clouds.map(c => [c.id, c]));

  // Each filter is a Set of selected values; an empty Set means "all".
  const state = { topic: new Set(), cloud: new Set(), level: new Set(), type: new Set(), status: new Set(), term: "" };
  const byId = new Map(SF.q.map((q, i) => { q.n = i + 1; return [q.id, q]; }));

  const $ = id => document.getElementById(id);
  const listEl = $("list");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const count = fn => SF.q.filter(fn).length;

  // ---------- multi-select dropdowns ----------
  const FILTERS = [
    { key: "cloud", label: "Cloud", groups: [{ name: "Cloud", items: SF.clouds.map(c => ({ v: c.id, label: c.name, n: count(q => q.clouds.includes(c.id)) })) }] },
    { key: "topic", label: "Topic", groups: SF.groups.map(g => ({
        name: g.name,
        items: SF.topics.filter(t => t.group === g.id).map(t => ({ v: t.id, label: t.name, n: count(q => q.topic === t.id) }))
      })).filter(g => g.items.length) },
    { key: "level", label: "Level", groups: [{ name: "Level", items: LEVELS.map(l => ({ v: l, label: l, n: count(q => q.level === l) })) }] },
    { key: "type", label: "Type", groups: [{ name: "Question type", items: Object.entries(TYPES).map(([k, v]) => ({ v: k, label: v, n: count(q => q.type === k) })) }] },
    { key: "status", label: "Progress", groups: [{ name: "Your progress", items: Object.entries(STATUSES).map(([k, v]) => ({ v: k, label: v })) }] }
  ];
  const allValues = f => f.groups.flatMap(g => g.items.map(i => i.v));
  const labelOf = (f, v) => f.groups.flatMap(g => g.items).find(i => i.v === v).label;

  const filtersEl = $("filters");
  FILTERS.forEach(f => {
    const wrap = document.createElement("div");
    wrap.className = "ms"; wrap.dataset.key = f.key;
    const pid = "ms-panel-" + f.key;
    let html = '<button type="button" class="ms-btn" aria-haspopup="true" aria-expanded="false" aria-controls="' + pid + '">' +
      '<span class="ms-label">' + f.label + '</span><span class="ms-val">All</span>' +
      '<svg class="ms-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div class="ms-panel" id="' + pid + '" role="group" aria-label="' + f.label + '" hidden>' +
      '<div class="ms-tools"><button type="button" data-act="all">Select all</button><button type="button" data-act="none">Clear</button></div>';
    f.groups.forEach(g => {
      html += '<fieldset' + (f.groups.length > 1 ? "" : ' class="single"') + "><legend>" + g.name + "</legend>";
      g.items.forEach(i => {
        const id = "f-" + f.key + "-" + i.v;
        html += '<label for="' + id + '"><input type="checkbox" id="' + id + '" value="' + i.v + '">' +
          '<span class="ms-item">' + i.label + "</span>" + (i.n != null ? '<span class="n">' + i.n + "</span>" : "") + "</label>";
      });
      html += "</fieldset>";
    });
    wrap.innerHTML = html + "</div>";
    filtersEl.appendChild(wrap);

    const btn = wrap.querySelector(".ms-btn"), panel = wrap.querySelector(".ms-panel");
    btn.addEventListener("click", () => (panel.hidden ? openPanel(wrap) : closePanels()));
    panel.addEventListener("change", e => {
      if (e.target.type !== "checkbox") return;
      e.target.checked ? state[f.key].add(e.target.value) : state[f.key].delete(e.target.value);
      normalise(f); render();
    });
    panel.addEventListener("click", e => {
      const act = e.target.dataset && e.target.dataset.act;
      if (!act) return;
      state[f.key] = act === "all" ? new Set(allValues(f)) : new Set();
      normalise(f); render();
    });
  });

  // all boxes ticked is the same as none ticked: show everything
  function normalise(f) { if (state[f.key].size === allValues(f).length) state[f.key] = new Set(); }

  function openPanel(wrap) {
    closePanels();
    const btn = wrap.querySelector(".ms-btn"), panel = wrap.querySelector(".ms-panel");
    panel.hidden = false; btn.setAttribute("aria-expanded", "true");
    panel.style.left = "0px";
    const r = panel.getBoundingClientRect(), max = document.documentElement.clientWidth - 12;
    if (r.right > max) panel.style.left = Math.max(-r.left + 12, max - r.right) + "px";   // keep it on screen
    const first = panel.querySelector("input"); if (first) first.focus();
  }
  function closePanels(returnFocus) {
    filtersEl.querySelectorAll(".ms").forEach(w => {
      const p = w.querySelector(".ms-panel"), b = w.querySelector(".ms-btn");
      if (!p.hidden) { p.hidden = true; b.setAttribute("aria-expanded", "false"); if (returnFocus) b.focus(); }
    });
  }
  document.addEventListener("click", e => { if (!e.target.closest(".ms")) closePanels(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closePanels(true); });

  function syncFilters() {
    FILTERS.forEach(f => {
      const wrap = filtersEl.querySelector('.ms[data-key="' + f.key + '"]');
      const sel = state[f.key];
      wrap.querySelectorAll("input[type=checkbox]").forEach(c => (c.checked = sel.has(c.value)));
      wrap.querySelector(".ms-val").textContent = sel.size === 0 ? "All" : sel.size === 1 ? labelOf(f, [...sel][0]) : sel.size + " selected";
      wrap.classList.toggle("active", sel.size > 0);
    });
    // active filter pills (quick remove)
    const pills = [];
    FILTERS.forEach(f => state[f.key].forEach(v => pills.push(
      '<button type="button" class="pill" data-k="' + f.key + '" data-v="' + esc(v) + '" aria-label="Remove ' + esc(f.label + ": " + labelOf(f, v)) + '">' +
      '<span class="pill-k">' + f.label + "</span>" + esc(labelOf(f, v)) + '<span aria-hidden="true" class="x">×</span></button>')));
    $("active").innerHTML = pills.join("") + (pills.length ? '<button type="button" class="clear-all" id="clear-all">Clear all filters</button>' : "");
    $("active").hidden = !pills.length;
  }
  $("active").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "clear-all") FILTERS.forEach(f => (state[f.key] = new Set()));
    else state[b.dataset.k].delete(b.dataset.v);
    render();
  });

  // ---------- filtering ----------
  const plain = html => html.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  SF.q.forEach(q => { q._text = (q.q + " " + plain(q.a)).toLowerCase(); });

  function matches(q) {
    if (state.topic.size && !state.topic.has(q.topic)) return false;
    if (state.cloud.size && !q.clouds.some(c => state.cloud.has(c))) return false;
    if (state.level.size && !state.level.has(q.level)) return false;
    if (state.type.size && !state.type.has(q.type)) return false;
    if (state.status.size && !state.status.has(P.status(q.id))) return false;
    if (state.term && !state.term.split(/\s+/).every(w => q._text.includes(w))) return false;
    return true;
  }
  const filtered = () => FILTERS.some(f => state[f.key].size) || !!state.term;

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
    const clouds = q.clouds.map(c => '<span class="cld c-' + c + '">' + CLOUD[c].short + "</span>").join("");
    d.innerHTML = '<summary><span class="num">Q' + q.n + '</span><span class="qt">' + q.q + '</span>' +
      '<span class="tags">' + clouds + '<span class="typ">' + (TYPES[q.type] || "") + '</span><span class="lvl ' + q.level + '">' + q.level + "</span></span></summary>";
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

  // ---------- progress bars ----------
  // Bars are created at 0 width and grown on the next frame, so they animate in;
  // later changes update the widths in place so the CSS transition runs.
  function tally(qs) {
    let done = 0, rev = 0;
    qs.forEach(q => { const s = P.status(q.id); if (s === "done") done++; else if (s === "review") rev++; });
    const pct = n => (qs.length ? (n / qs.length) * 100 : 0);
    return { done, rev, total: qs.length, pd: pct(done), pr: pct(rev) };
  }
  function meter(qs, big) {
    const t = tally(qs);
    return '<span class="meter' + (big ? " big" : "") + '" role="img" aria-label="' + meterLabel(t) + '">' +
      '<span class="track"><span class="d" style="width:0" data-w="' + t.pd + '"></span><span class="r" style="width:0" data-w="' + t.pr + '"></span></span>' +
      '<span class="mtext">' + meterText(t, big) + "</span></span>";
  }
  const meterLabel = t => t.done + " of " + t.total + " done, " + t.rev + " in review";
  const meterText = (t, big) => big
    ? "<b>" + Math.round(t.pd) + "%</b> done · " + t.done + "/" + t.total + " questions · " + t.rev + " in review"
    : t.done + " done · " + t.rev + " review";
  function growMeters(root) {
    requestAnimationFrame(() => requestAnimationFrame(() =>
      root.querySelectorAll(".meter [data-w]").forEach(s => { s.style.width = s.dataset.w + "%"; })));
  }
  function updateMeter(el, qs) {
    const t = tally(qs), d = el.querySelector(".d"), r = el.querySelector(".r");
    const grew = t.pd > parseFloat(d.dataset.w || 0);
    d.dataset.w = t.pd; r.dataset.w = t.pr;
    d.style.width = t.pd + "%"; r.style.width = t.pr + "%";
    el.querySelector(".mtext").innerHTML = meterText(t, el.classList.contains("big"));
    el.setAttribute("aria-label", meterLabel(t));
    if (grew) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }

  function render() {
    syncFilters();
    listEl.innerHTML = "";
    let shown = 0;
    SF.topics.forEach(t => {
      if (state.topic.size && !state.topic.has(t.id)) return;
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
    if (!shown) listEl.innerHTML = '<p class="empty">No questions match these filters. Remove a filter or clear the search.</p>';
    $("result-count").textContent = filtered() ? shown + " of " + SF.q.length + " questions match" : "";
    growMeters(listEl);
    stats();
  }

  function stats() {
    const lv = l => count(q => q.level === l);
    $("stats").innerHTML =
      "<span><b>" + SF.q.length + "</b> questions</span><span><b>" + SF.topics.length + "</b> topics</span>" +
      "<span><b>" + lv("Basic") + "</b> basic · <b>" + lv("Mid") + "</b> mid · <b>" + lv("Senior") + "</b> senior</span>";
    const box = $("overall");
    if (!box.firstChild) { box.innerHTML = meter(SF.q, true); growMeters(box); }
    else updateMeter(box.firstChild, SF.q);
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
      el.innerHTML = '<span class="who">' + esc(u.email || "Signed in") + '</span><span class="sync ' + (s === "error" ? "err" : s === "synced" ? "ok" : "") + '">' + label +
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
    if (!matches(byId.get(id))) {
      FILTERS.forEach(f => (state[f.key] = new Set()));
      state.term = ""; $("q").value = ""; render();
    }
    openQuestion(id);
  }
  window.addEventListener("hashchange", fromHash);

  P.onChange(() => {
    account();
    if (state.status.size) render();
    else {
      listEl.querySelectorAll("details.qa").forEach(refreshCard);
      listEl.querySelectorAll("section.topic").forEach(sec => {
        const m = sec.querySelector(".meter"); if (m) updateMeter(m, SF.q.filter(q => q.topic === sec.dataset.topic));
      });
      stats();
    }
  });

  render();
  account();
  fromHash();
})();
