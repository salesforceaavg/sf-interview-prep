SF.add("perf", [
["perf-101","Senior","concept",`What are skinny tables and when do they help?`,
`<p>A skinny table is a Salesforce-maintained copy of selected fields from an object (standard and custom fields in one table, no joins), created by Support. It speeds up reports, list views and SOQL on very large objects (millions of rows). Limitations: up to 100 columns, can't include fields from other objects, must be recreated when fields change, copied to Full sandboxes only. Consider after optimising queries and indexes.</p>`],
["perf-102","Senior","concept",`How does sharing recalculation affect performance and how do you minimise it?`,
`<ul><li>Changing role hierarchy, sharing rules, group membership or record ownership on large objects triggers recalculation of share tables.</li>
<li>Avoid ownership skew; put integration/owner users in a role near the top without subordinates or no role.</li>
<li>Use "Defer Sharing Calculations" during big changes (enabled by Support).</li>
<li>Prefer public read-only OWD where acceptable instead of many sharing rules.</li>
<li>Use Apex managed sharing selectively; each share row counts in table size.</li></ul>`],
["perf-103","Senior","scenario",`A report on Cases (20 million rows) times out. How do you fix it?`,
`<ul><li>Add selective filters on indexed fields (CreatedDate range, RecordType).</li>
<li>Avoid "contains" filters and cross-object formula filters.</li>
<li>Use Reporting Snapshots or summary objects populated nightly by Batch Apex for historical trends.</li>
<li>Archive old cases (Big Objects / external storage).</li>
<li>Ask Support for custom indexes or a skinny table; consider CRM Analytics / Data Cloud for heavy analytics.</li></ul>`],
["perf-104","Mid","concept",`What is "data skew" in lookups (lookup skew) and an example?`,
`<p>Lookup skew: a very large number of records (&gt;10,000) point to one record via a lookup, e.g. all Cases referencing a single "Unknown" Account or Product. Every child insert/update locks the parent briefly, so concurrent loads hit <code>UNABLE_TO_LOCK_ROW</code>. Fix by distributing (multiple placeholder records), using picklists instead of lookups for small value sets, or leaving the lookup blank.</p>`],
["perf-105","Senior","concept",`How do you load 10 million records efficiently?`,
`<ul><li>Bulk API 2.0 (parallel), CSV sorted by parent Id to reduce locks.</li>
<li>Disable/bypass triggers, flows, validation rules, duplicate rules for the load user; defer sharing calculations.</li>
<li>Load parents first, use External Ids for relationships (no lookups by Salesforce Id needed).</li>
<li>Insert-only is faster than upsert; avoid workflow/rollups recalculation by loading children before enabling rollup logic.</li>
<li>Test with a Full sandbox; monitor Bulk job status and failed records.</li></ul>`],
["perf-106","Mid","concept",`How do you measure Lightning page performance?`,
`<ul><li>Experienced Page Time (EPT) in Lightning Usage app and in the page header (with debug mode or "?eptVisible=1").</li>
<li>Salesforce Lightning Inspector / Chrome DevTools Performance tab.</li>
<li>Count components, Apex calls and their server times in the Network tab.</li>
<li>Compare with Salesforce's network/browser recommendations (Octane score).</li></ul>`],
["perf-107","Senior","concept",`What causes "Apex heap size too large" in a batch and how do you fix it?`,
`<ul><li>Database.Stateful holding growing collections across chunks (e.g. storing every processed Id).</li>
<li>Large text/blob fields in the query.</li>
<li>Building huge strings (CSV) in memory.</li>
<li>Fix: keep only counters or small error lists in state, write intermediate results to records/files per chunk, select fewer fields, reduce scope size.</li></ul>`],
["perf-108","Mid","concept",`Why can formula fields slow down queries and list views?`,
`<p>Formulas are calculated at query time. Filtering or sorting on a formula on a large object forces evaluation for many rows and usually can't use an index (only deterministic formulas meeting criteria can be indexed by Support). Cross-object formulas add joins. For heavy filters, store the value in a regular field maintained by automation.</p>`],
["perf-109","Senior","scenario",`CPU time spikes when a Flow and a trigger both run on Account updates from an integration. How do you diagnose which costs more?`,
`<ul><li>Debug log with Apex Profiling and Workflow at FINE; open in Apex Log Analyzer for a timeline of code units (trigger handlers vs flow elements).</li>
<li>Check for repeated execution (re-saves from after-save updates).</li>
<li>Use <code>Limits.getCpuTime()</code> checkpoints in the handler.</li>
<li>Test with 200-record batches mimicking the integration.</li>
<li>Then optimise the hot spot: move flow logic to before-save or Apex, add entry criteria, bypass for integration user.</li></ul>`],
["perf-110","Mid","concept",`What are the 'divisions' and when were they used for performance?`,
`<p>Divisions partition data (records and users) into logical segments so searches, list views and reports default to a user's division, improving performance in very large orgs. They're enabled by Support and less common today; selective filters, archiving and indexing are the usual approaches.</p>`]
]);
