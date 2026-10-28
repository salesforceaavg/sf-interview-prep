// Topic list (order = order on the page), filter categories, clouds, and the loader
// used by every data file.
//
// Question row format: [id, level, type, question, answerHtml, clouds?]
//   id      stable, never reuse or renumber (progress is stored against it)
//   level   Basic | Mid | Senior
//   type    concept | scenario | code | output | design
//   clouds  optional array to override automatic cloud tagging, e.g. ["sales","service"]
//           (values: core, sales, service, exp)
window.SF = {
  // Topic dropdown groups, in display order
  groups: [
    { id: "dev",      name: "Apex development" },
    { id: "ui",       name: "User interface" },
    { id: "platform", name: "Integration & security" },
    { id: "config",   name: "Configuration" },
    { id: "delivery", name: "Quality & delivery" },
    { id: "clouds",   name: "Clouds" },
    { id: "practice", name: "Practice sets" }
  ],
  topics: [
    { id: "apex",     group: "dev",      name: "Apex",                  desc: "Language internals, collections, limits, patterns, exceptions" },
    { id: "soql",     group: "dev",      name: "SOQL & SOSL",           desc: "Relationship queries, aggregates, selectivity, search" },
    { id: "dml",      group: "dev",      name: "DML",                   desc: "Insert, upsert, merge, savepoints, partial success, locking" },
    { id: "trigger",  group: "dev",      name: "Triggers",              desc: "Frameworks, recursion, bulkification, order of execution" },
    { id: "async",    group: "dev",      name: "Async Apex",            desc: "Future, Queueable, Batch, Schedulable, Platform Events" },
    { id: "lwc",      group: "ui",       name: "LWC",                   desc: "Lightning Web Components, wire, events, LDS, performance" },
    { id: "vf",       group: "ui",       name: "Visualforce",           desc: "Controllers, view state, remoting, migration" },
    { id: "integ",    group: "platform", name: "Integration",           desc: "REST/SOAP, callouts, auth, CDC, middleware patterns" },
    { id: "sec",      group: "platform", name: "Security",              desc: "Sharing model, CRUD/FLS, with/without sharing, Shield" },
    { id: "admin",    group: "config",   name: "Admin & Flow",          desc: "Flows, validation, data model, configuration" },
    { id: "testing",  group: "delivery", name: "Testing",               desc: "Test design, data factories, mocks, async and permission tests" },
    { id: "devops",   group: "delivery", name: "DevOps",                desc: "Salesforce CLI, packaging, CI/CD, branching, deployments" },
    { id: "perf",     group: "delivery", name: "Performance & LDV",     desc: "Large data volumes, skew, locking, query and page performance" },
    { id: "sales",    group: "clouds",   name: "Sales Cloud",           desc: "Leads, opportunities, forecasting, territory, quotes" },
    { id: "service",  group: "clouds",   name: "Service Cloud",         desc: "Cases, Omni-Channel, entitlements, knowledge, messaging" },
    { id: "exp",      group: "clouds",   name: "Experience Cloud",      desc: "Sites, external users, sharing sets, guest access" },
    { id: "logic",    group: "practice", name: "Code Output & Bugs",    desc: "Predict the output or find the bug: the questions that trip people up" },
    { id: "criteria", group: "practice", name: "Criteria-Based Coding", desc: "A business requirement is given; write the trigger, query or class" },
    { id: "scenario", group: "practice", name: "Scenarios & Design",    desc: "Architecture, troubleshooting and judgement questions" }
  ],

  // Cloud filter. A question can belong to several clouds. "core" means the
  // question applies to every cloud (Apex, LWC, security...).
  clouds: [
    { id: "core",    name: "Core Platform", short: "Platform" },
    { id: "sales",   name: "Sales Cloud",      short: "Sales" },
    { id: "service", name: "Service Cloud",    short: "Service" },
    { id: "exp",     name: "Experience Cloud", short: "Experience" }
  ],

  q: [],
  add(topic, rows) {
    rows.forEach(r => this.q.push({ id: r[0], topic, level: r[1], type: r[2], q: r[3], a: r[4], cloudOverride: r[5] }));
  }
};
