// Loads admin edits from Supabase and applies them over the built-in questions.
//
//   SF.base      copy of the built-in questions (from data/*.js), never modified
//   SF.ready     Promise that resolves once edits are applied (or skipped)
//   SF.sanitize  cleans HTML coming from the database before it is shown
//
// If the database is slow or unreachable the site falls back to the built-in
// questions after a few seconds, so it never hangs on a paused free project.
(() => {
  const SF = window.SF;
  SF.base = SF.q.map(q => ({ ...q }));
  SF.edits = new Map();   // id -> database row

  // ---- HTML sanitizer (allow-list) ----
  const ALLOWED = {
    P: [], BR: [], UL: [], OL: [], LI: [], PRE: [], CODE: [], B: [], STRONG: [], I: [], EM: [],
    TABLE: [], THEAD: [], TBODY: [], TR: [], TH: ["colspan", "rowspan"], TD: ["colspan", "rowspan"],
    DIV: ["class"], SPAN: ["class"], A: ["href"], H3: [], H4: [], BLOCKQUOTE: [], SUB: [], SUP: []
  };
  const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "SVG", "MATH", "TEMPLATE"]);
  const CLASSES = new Set(["tbl", "tip"]);

  function clean(node) {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) return;                              // text
      if (ch.nodeType !== 1) { ch.remove(); return; }             // comments etc.
      const tag = ch.tagName;
      if (DROP.has(tag)) { ch.remove(); return; }
      if (!ALLOWED[tag]) { clean(ch); ch.replaceWith(...ch.childNodes); return; }   // unwrap unknown tags
      [...ch.attributes].forEach(a => {
        const name = a.name.toLowerCase();
        if (!ALLOWED[tag].includes(name)) { ch.removeAttribute(a.name); return; }
        if (name === "href" && !/^https?:\/\//i.test(a.value.trim())) ch.removeAttribute(a.name);
        if (name === "class") {
          const keep = a.value.split(/\s+/).filter(c => CLASSES.has(c));
          keep.length ? ch.setAttribute("class", keep.join(" ")) : ch.removeAttribute("class");
        }
      });
      if (tag === "A") { ch.setAttribute("target", "_blank"); ch.setAttribute("rel", "noopener noreferrer"); }
      clean(ch);
    });
  }
  SF.sanitize = html => {
    const doc = new DOMParser().parseFromString("<div>" + String(html || "") + "</div>", "text/html");
    const root = doc.body.firstElementChild;
    if (!root) return "";
    clean(root);
    return root.innerHTML;
  };

  // ---- overlay ----
  SF.applyEdits = rows => {
    SF.edits = new Map(rows.map(r => [r.id, r]));
    const out = SF.base.map(q => ({ ...q }));
    const index = new Map(out.map((q, i) => [q.id, i]));
    rows.forEach(r => {
      const q = {
        id: r.id, topic: r.topic, level: r.level, type: r.type,
        q: SF.sanitize(r.question), a: SF.sanitize(r.answer),
        cloudOverride: Array.isArray(r.clouds) && r.clouds.length ? r.clouds : undefined,
        source: index.has(r.id) ? "edited" : "new", deleted: !!r.deleted
      };
      if (index.has(r.id)) out[index.get(r.id)] = q; else { index.set(r.id, out.length); out.push(q); }
    });
    SF.q = out.filter(q => !q.deleted && SF.topics.some(t => t.id === q.topic));
  };

  SF.fetchEdits = async () => {
    const res = await window.SFDB.from("questions")
      .select("id,topic,level,type,question,answer,clouds,deleted,updated_at")
      .order("id", { ascending: true })
      .range(0, 9999);
    if (res.error) throw res.error;
    return res.data || [];
  };

  const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
  SF.ready = (async () => {
    if (!window.SFDB) return;
    try { SF.applyEdits(await Promise.race([SF.fetchEdits(), timeout(4000)])); }
    catch (e) { console.warn("Showing built-in questions; admin edits not loaded:", e.message || e); }
  })();
})();
