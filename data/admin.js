SF.add("admin", [
["admin-101","Senior","concept",`What are the most common Flow performance and limit mistakes, and how do you avoid them?`,
`<ul><li>Get Records / Create / Update inside a Loop → SOQL/DML per iteration. Collect into a collection variable and do one DML after the loop.</li>
<li>After-save flow updating the triggering record → extra save cycle; use before-save for same-record field updates.</li>
<li>Entry conditions missing "only when record is updated to meet the condition" → runs on every edit.</li>
<li>Many flows on one object without Trigger Order set → unpredictable order.</li>
<li>Large collections processed in screen flows → CPU timeouts; move to async path or Apex.</li>
<li>Not handling Fault paths → users see generic errors; add fault connectors with logging.</li></ul>`],
["admin-102","Mid","concept",`What is the "Run Asynchronously" path in a record-triggered flow?`,
`<p>An after-save flow path that runs after the transaction commits, in a separate transaction (like a Queueable). Use it for callouts (HTTP Callout action, External Services), slow operations or work that shouldn't block the user. It has its own limits and won't roll back the original save on failure.</p>`],
["admin-103","Senior","concept",`How do you handle errors in Flow properly?`,
`<ul><li>Add Fault connectors on every data and action element.</li>
<li>In the fault path, log <code>{!$Flow.FaultMessage}</code> plus record Id to a log object or platform event, and show a friendly message in screen flows.</li>
<li>Use "Custom Error" element (in record-triggered flows) to block saves with field-level messages, like addError.</li>
<li>Set "Flow and Process Error emails" recipients; check Paused and Failed Flow Interviews.</li>
<li>Use Roll Back Records in screen flows to undo earlier DML in the same transaction.</li></ul>`],
["admin-104","Mid","concept",`What is the difference between Flow's "Update Records" using the triggering record vs specifying conditions?`,
`<p>"Use the record that triggered the flow" updates <code>$Record</code> fields (in before-save, it's a free assignment without DML; in after-save it's a DML on the same record). "Specify conditions" queries and updates other records matching filters: one DML for all matches but bound by limits on number of records.</p>`],
["admin-105","Senior","design",`A business process needs a 5-step approval with parallel legal and finance review, SLAs and reminders. Approval Process, Flow Orchestration or Apex?`,
`<ul><li><b>Classic Approval Process</b>: sequential steps, simple; parallel approval only for multiple approvers on one step ("unanimous" or "first response"); limited SLA handling.</li>
<li><b>Flow Orchestration / Flow Approval Process</b>: stages and steps, parallel steps, background steps, work items in a guide component, entry/exit conditions, reminders via scheduled paths. Better fit.</li>
<li><b>Apex</b>: only for edge logic as invocable actions.</li></ul>
<p>Answer: Flow Orchestration (or the newer Flow-based Approval Processes) with parallel Legal/Finance stage, SLA timers, and an approval history object for audit.</p>`],
["admin-106","Mid","concept",`When should you use a formula field vs a stored field updated by automation?`,
`<ul><li>Formula: always current, no automation needed, but calculated at read time, can't be indexed easily, can slow list views/reports, and can't be used in some filters or rollups.</li>
<li>Stored field: indexable, faster reports, usable in roll-ups and as triggers' criteria, but needs automation for every change path and can go stale.</li></ul>
<p>Choose stored fields for values used in large-volume filters or SLAs; formulas for display.</p>`],
["admin-107","Mid","concept",`What is Dynamic Forms and Dynamic Actions and why do they reduce code?`,
`<p>Dynamic Forms place individual fields/sections on Lightning record pages with visibility rules (based on field values, user, device), replacing multiple page layouts and record types used only for layout. Dynamic Actions show buttons conditionally. Many custom LWCs built only to hide/show fields become unnecessary.</p>`],
["admin-108","Senior","concept",`Explain the data model choices: when to use a custom object vs Custom Metadata vs Big Object vs External Object.`,
`<ul><li><b>Custom object</b>: business data with sharing, reports, automation.</li>
<li><b>Custom Metadata</b>: configuration deployed with code; cached; read-only at runtime (writes via Metadata API).</li>
<li><b>Big Object</b>: billions of rows, append-mostly history/audit, limited querying.</li>
<li><b>External Object</b>: data stays in another system, viewed in real time via Salesforce Connect.</li>
<li><b>Custom Settings</b>: hierarchy-based per-user/profile config, editable at runtime.</li></ul>`],
["admin-109","Mid","concept",`What are Global Value Sets and Restricted Picklists?`,
`<p>A Global Value Set shares one list of picklist values across fields/objects so they stay consistent. A restricted picklist rejects any value not in the list, even via API (an unrestricted picklist accepts unknown values from API, causing dirty data). Use restricted for integrations' data quality.</p>`],
["admin-110","Senior","scenario",`You must migrate 40 Workflow Rules and Process Builders to Flow. What's your approach?`,
`<ul><li>Inventory with the Migrate to Flow tool and Optimizer; group by object.</li>
<li>Consolidate: one before-save flow for same-record field updates per object, a few after-save flows by purpose, instead of 1:1 migration.</li>
<li>Time-based actions → scheduled paths (pending actions don't migrate automatically: plan for in-flight items).</li>
<li>Set trigger order, test in sandbox with representative data, compare outcomes, deploy in phases, deactivate old automation in the same release.</li></ul>`],
["admin-111","Mid","concept",`What are Screen Flow components and how does an LWC integrate into a Screen Flow?`,
`<p>Screen flows show standard components (inputs, data tables, lookups) and custom LWCs exposed with target <code>lightning__FlowScreen</code>. LWC exposes <code>@api</code> properties as inputs/outputs; to send values back it fires <code>FlowAttributeChangeEvent</code>; it can implement <code>@api validate()</code> to block Next with a message; navigation via <code>FlowNavigationNextEvent</code>.</p>`],
["admin-112","Senior","concept",`How do you call a Flow from Apex and pass variables?`,
`<pre><code>Map&lt;String, Object&gt; inputs = new Map&lt;String, Object&gt;{ 'recordId' =&gt; caseId, 'reason' =&gt; 'Duplicate' };
Flow.Interview.Close_Case_Flow f = new Flow.Interview.Close_Case_Flow(inputs);
f.start();
String result = (String) f.getVariableValue('outcome');</code></pre>
<p>Only autolaunched flows; variables must be marked "Available for input/output". Runs in the same transaction and shares limits. Dynamic: <code>Flow.Interview.createInterview('Close_Case_Flow', inputs)</code>.</p>`],
["admin-113","Mid","concept",`What are record-triggered flow entry conditions "Only when a record is updated to meet the condition requirements"?`,
`<p>The flow runs only on the transition (false → true), similar to "ISCHANGED + criteria" in Apex. Without it, the flow runs on every save while the condition stays true, causing duplicate tasks/emails. You can also use <code>$Record__Prior</code> in conditions to compare old values explicitly.</p>`],
["admin-114","Senior","concept",`What are the main org limits and storage considerations you watch as a developer?`,
`<ul><li>Data storage (records ~2 KB each) and file storage.</li>
<li>Custom fields per object (500–800 depending on edition), relationships per object (40), roll-up summaries per object (40 default).</li>
<li>Daily API requests, async Apex executions, outbound emails (5,000 single emails per day to external addresses).</li>
<li>Code size limit (6 MB of Apex characters, excluding comments and tests).</li>
<li>Monitor in System Overview and the Limits REST resource.</li></ul>`],
["admin-115","Mid","concept",`How do you send emails at scale from Salesforce and what are the limits?`,
`<ul><li><code>Messaging.SingleEmailMessage</code> sent to internal <b>Users</b> with <code>setTargetObjectId</code> doesn't count toward the daily single-email limit; emails to Contacts, Leads and plain addresses do (5,000 external recipients per day per org on most editions). Check with <code>Messaging.reserveSingleEmailCapacity(n)</code>.</li>
<li>10 <code>sendEmail</code> calls per transaction.</li>
<li>Use Email Templates (Lightning) with merge fields; <code>setSaveAsActivity</code>.</li>
<li>For marketing volumes use Marketing Cloud / Account Engagement.</li></ul>`],
["admin-116","Senior","concept",`What is a "before-save" flow and why is it 10x faster than after-save updates?`,
`<p>A before-save (fast field update) flow changes <code>$Record</code> fields before the record is written, like a before trigger — no extra DML, no re-run of triggers/flows. After-save updates on the same record perform another DML, which re-runs before/after triggers, validation, and other automation. Salesforce benchmarks show before-save flows are much faster for same-record updates.</p>`],
["admin-117","Mid","concept",`What are Custom Notifications and how do you send them from Apex?`,
`<pre><code>Messaging.CustomNotification n = new Messaging.CustomNotification();
n.setNotificationTypeId(typeId);      // CustomNotificationType record
n.setTitle('Escalated case');
n.setBody('Case ' + c.CaseNumber + ' breached SLA');
n.setTargetId(c.Id);
n.send(new Set&lt;String&gt;{ managerId });</code></pre>
<p>Shows in the bell and mobile push; also available as a Flow action.</p>`],
["admin-118","Senior","scenario",`A field update suddenly fails for all users with "FIELD_CUSTOM_VALIDATION_EXCEPTION" after a release, but you didn't change that field. How do you find the cause?`,
`<ul><li>Read the exact message; search validation rules by message text (Setup or Tooling API query on ValidationRule).</li>
<li>Check new validation rules or flows with Custom Error elements, and Apex triggers using addError, deployed in the release.</li>
<li>Rules referencing fields that are now required by new record types or picklist values.</li>
<li>Use a debug log to see which VALIDATION_RULE evaluated to true.</li>
<li>Add bypass via custom permission in rules for integrations.</li></ul>`],
["admin-119","Mid","concept",`How do Queues, Public Groups and Roles differ?`,
`<ul><li><b>Queue</b>: can own records; members pick work; used with assignment rules and Omni-Channel.</li>
<li><b>Public Group</b>: a set of users/roles/groups used in sharing rules, list view visibility, folders.</li>
<li><b>Role</b>: position in the hierarchy controlling upward record visibility and forecasts.</li></ul>`],
["admin-120","Senior","concept",`What's your approach to automation strategy for an object with heavy logic (Opportunity)?`,
`<ul><li>Before-save flow: simple field defaults.</li>
<li>One Apex trigger + handler: complex logic, rollups, integrations.</li>
<li>After-save flows only for admin-owned notifications/tasks, with explicit trigger order.</li>
<li>Validation rules with bypass permission.</li>
<li>Document an automation map (which tool, what it does, order) in the repo; review new automation against it.</li></ul>`]
]);
