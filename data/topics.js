// Topic list (order = order on the page) and the loader used by every data file.
// Question row format: [id, level, type, question, answerHtml]
//   id     stable, never reuse or renumber (progress is stored against it)
//   level  Basic | Mid | Senior
//   type   concept | scenario | code | output | design
window.SF = {
  topics: [
    { id: "apex",     name: "Apex",                 desc: "Language internals, collections, limits, patterns, exceptions" },
    { id: "soql",     name: "SOQL & SOSL",          desc: "Relationship queries, aggregates, selectivity, search" },
    { id: "dml",      name: "DML",                  desc: "Insert, upsert, merge, savepoints, partial success, locking" },
    { id: "trigger",  name: "Triggers",             desc: "Frameworks, recursion, bulkification, order of execution" },
    { id: "async",    name: "Async Apex",           desc: "Future, Queueable, Batch, Schedulable, Platform Events" },
    { id: "lwc",      name: "LWC",                  desc: "Lightning Web Components, wire, events, LDS, performance" },
    { id: "vf",       name: "Visualforce",          desc: "Controllers, view state, remoting, migration" },
    { id: "integ",    name: "Integration",          desc: "REST/SOAP, callouts, auth, CDC, middleware patterns" },
    { id: "sec",      name: "Security",             desc: "Sharing model, CRUD/FLS, with/without sharing, Shield" },
    { id: "admin",    name: "Admin & Flow",         desc: "Flows, validation, data model, configuration" },
    { id: "testing",  name: "Testing",              desc: "Test design, data factories, mocks, async and permission tests" },
    { id: "devops",   name: "DevOps",               desc: "Salesforce CLI, packaging, CI/CD, branching, deployments" },
    { id: "perf",     name: "Performance & LDV",    desc: "Large data volumes, skew, locking, query and page performance" },
    { id: "sales",    name: "Sales Cloud",          desc: "Leads, opportunities, forecasting, territory, quotes" },
    { id: "service",  name: "Service Cloud",        desc: "Cases, Omni-Channel, entitlements, knowledge, messaging" },
    { id: "exp",      name: "Experience Cloud",     desc: "Sites, external users, sharing sets, guest access" },
    { id: "logic",    name: "Code Output & Bugs",   desc: "Predict the output or find the bug: the questions that trip people up" },
    { id: "criteria", name: "Criteria-Based Coding",desc: "A business requirement is given; write the trigger, query or class" },
    { id: "scenario", name: "Scenarios & Design",   desc: "Architecture, troubleshooting and judgement questions" }
  ],
  q: [],
  add(topic, rows) {
    rows.forEach(r => this.q.push({ id: r[0], topic, level: r[1], type: r[2], q: r[3], a: r[4] }));
  }
};
