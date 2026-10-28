// Tags every question with the clouds it relates to.
// Questions in the Sales/Service/Experience topics always get that cloud.
// Other questions are tagged by keywords in the question text; anything left
// untagged is "core" (applies to every cloud). A row's 6th element overrides this.
(() => {
  const RULES = {
    sales: /\b(opportunit\w*|leads?|lead conversion|quotes?|forecast\w*|territor\w*|price ?books?|products?|campaigns?|sales (cloud|users?|reps?|vp|processes)|deals?|renewals?|discounts?|cpq|invoices?)\b/i,
    service: /\b(cases?|omni-channel|omni|entitlements?|milestones?|knowledge|email-to-case|service (cloud|console|agents?)|messaging|chat|agentforce|support (tickets?|agents?)|sla)\b/i,
    exp: /\b(experience cloud|portals?|guest( users?)?|communit\w*|partner (users?|portal|accounts?)|external users?|lwr|sites?|self-registration|customer community)\b/i
  };
  // phrases that look like a cloud keyword but aren't
  const NOISE = /\b(use cases?|test cases?|edge cases?|in (that|this|each|every) case|in case|every case|each case|worst case|best case|case-(in)?sensitive|camel ?case|lower ?case|upper ?case|team leads?)\b/gi;
  const TOPIC_CLOUD = { sales: "sales", service: "service", exp: "exp" };
  // hand-checked corrections where keywords mislead
  const FIXED = {
    "service-008": ["service"],     // "product skill" is a routing skill, not Sales
    "sec-104": ["core"]             // generic sharing design
  };

  window.SF.q.forEach(q => {
    const fixed = (Array.isArray(q.cloudOverride) && q.cloudOverride.length) ? q.cloudOverride : FIXED[q.id];
    if (fixed) { q.clouds = fixed; return; }
    const text = q.q.replace(/<[^>]+>/g, " ").replace(NOISE, " ");
    const set = new Set();
    if (TOPIC_CLOUD[q.topic]) set.add(TOPIC_CLOUD[q.topic]);
    Object.keys(RULES).forEach(c => { if (RULES[c].test(text)) set.add(c); });
    q.clouds = set.size ? [...set] : ["core"];
  });
})();
