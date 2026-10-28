SF.add("scenario", [
["scenario-101","Senior","design",`Design a multi-currency pricing engine where prices depend on region, customer tier and volume breaks, used by LWC quoting and an API.`,
`<ul><li><b>Data</b>: Price_Rule__c (product, region, tier, min qty, price, currency, valid from/to) — business-maintained data, not metadata, because it changes often.</li>
<li><b>Service</b>: <code>PricingService.price(List&lt;PriceRequest&gt;)</code> bulk API returning <code>PriceResult</code> with explanation (which rule applied). One query for all products/regions in the request; resolve most specific rule first.</li>
<li><b>Caching</b>: Platform Cache (org) for rule sets by region, invalidated by a trigger on Price_Rule__c.</li>
<li><b>Currency</b>: multi-currency enabled; store rule currency; convert with <code>DatedConversionRate</code> if advanced currency management.</li>
<li><b>Entry points</b>: LWC controller and Apex REST call the same service.</li>
<li><b>Tests</b>: table-driven tests over rule combinations.</li></ul>`],
["scenario-102","Senior","scenario",`Production is throwing "Apex CPU time limit exceeded" on Opportunity save since yesterday's release. Walk through your incident response.`,
`<ol><li>Assess impact: which users/entry points fail (UI, integration)? Communicate.</li>
<li>Quick mitigation: if a feature toggle or bypass permission exists, disable the new logic; otherwise prepare a rollback deployment of the changed classes/flows.</li>
<li>Diagnose: debug log for a failing save with profiling; Apex Log Analyzer to find the hot spot; compare with the release diff.</li>
<li>Typical causes: new nested loop, new flow on the object, recursive updates, a query returning far more rows in production data.</li>
<li>Fix forward with a test reproducing 200-record bulk and production-like data volume.</li>
<li>Post-mortem: add performance tests, feature flags for risky changes, automation map review.</li></ol>`],
["scenario-103","Senior","design",`How would you design an audit trail for 30 fields on Account that must be kept for 7 years?`,
`<ul><li>Standard field history: max 20 fields per object, 18 months (24 via API) — not enough.</li>
<li>Shield Field Audit Trail: up to 60 fields per object, retention up to 10 years — the platform answer if licensed.</li>
<li>Custom: CDC trigger (async, after commit) writing changed fields (from <code>changedFields</code> in the header) into a Big Object keyed by record Id + timestamp; cheap storage, no impact on save time.</li>
<li>UI: LWC history viewer querying the big object by index.</li>
<li>Purge policy after 7 years.</li></ul>`],
["scenario-104","Senior","scenario",`A Sales VP says reps can see each other's pipeline though OWD is Private. Find the leak.`,
`<ul><li>Check "Sharing" button on a sample opportunity for the row cause: role hierarchy, sharing rules, team, territory, manual, Apex.</li>
<li>Look for sharing rules granting to "All Internal Users" or broad public groups.</li>
<li>Check roles: reps in the same role don't see each other via hierarchy, but if reps are assigned to a manager role by mistake they do.</li>
<li>Permission sets with "View All" on Opportunity or "View All Data".</li>
<li>Territory management access levels.</li>
<li>Reports in shared folders run as "running user" dashboards (dynamic vs fixed running user).</li>
<li>Custom LWCs/Apex with <code>without sharing</code>.</li></ul>`],
["scenario-105","Senior","design",`A company is merging two Salesforce orgs into one. What are the main technical workstreams?`,
`<ul><li><b>Discovery</b>: object/field inventory, automation, integrations, packages, users and licenses in both orgs.</li>
<li><b>Data model rationalisation</b>: map duplicate objects/fields, picklists, record types; decide which org survives.</li>
<li><b>Code</b>: namespace/name collisions, merge or refactor triggers into one framework per object.</li>
<li><b>Data migration</b>: external Ids for legacy Ids, dedupe Accounts/Contacts across orgs, load order, attachments/files, history.</li>
<li><b>Security</b>: combined role hierarchy, sharing, profiles → permission sets.</li>
<li><b>Integrations</b>: re-point endpoints, credentials.</li>
<li><b>Cut-over</b>: freeze period, delta loads, user training, hypercare.</li></ul>`],
["scenario-106","Senior","scenario",`An integration user's API calls fail with "REQUEST_LIMIT_EXCEEDED" at 3 pm every day. What do you do short and long term?`,
`<ul><li>Short term: identify the consumer (Event Monitoring API logs or "API Usage Last 7 Days" report by user/client id); throttle or pause non-critical jobs; temporary limit increase from Salesforce if business-critical.</li>
<li>Long term: switch polling to events (CDC/Pub/Sub), use Composite/collections/Bulk API to reduce call count, cache reference data, schedule heavy syncs off-peak, and set API usage notifications at 70/90%.</li></ul>`],
["scenario-107","Senior","design",`Design a solution for field sales reps working offline on mobile (visits, orders) with sync later.`,
`<ul><li>Salesforce mobile app with Briefcase Builder to prime records offline (accounts in territory, products, open orders).</li>
<li>LWCs built on LDS/UI API (Apex isn't available offline) and offline-ready components; Quick actions for creating visits/orders offline, queued drafts sync when online.</li>
<li>Conflict handling for records edited online meanwhile (server wins/validation errors surfaced in pending changes).</li>
<li>Alternative for heavy offline: Field Service mobile app or a custom mobile app with Mobile SDK and SmartStore.</li></ul>`],
["scenario-108","Senior","scenario",`Users report that a record-triggered flow sometimes doesn't run. How do you investigate?`,
`<ul><li>Check entry conditions and "when to run" (only on create? only when updated to meet criteria?) against the actual record change.</li>
<li>Was the record updated by an integration with bypass logic (custom permission in entry conditions)?</li>
<li>Was the change made by a process that doesn't fire flows (e.g. some mass updates, formula field changes don't trigger)?</li>
<li>Flow version: is the active version the one expected?</li>
<li>Fault: check failed flow interview emails and Paused/Failed interviews; scheduled paths waiting.</li>
<li>Debug the flow with the record, or enable debug logs with Workflow at FINER.</li></ul>`],
["scenario-109","Senior","design",`How would you implement a "360° customer view" LWC that combines Salesforce data, ERP invoices and support tickets from Zendesk?`,
`<ul><li>Container LWC on the Account page; Salesforce data via LDS/Apex.</li>
<li>External data via Apex callouts with Named Credentials, executed in parallel using Continuation (up to 3 requests) or separate cacheable calls from separate child components so they load independently.</li>
<li>Cache external responses (Platform Cache, 5–15 min) to reduce latency and API usage.</li>
<li>Or Salesforce Connect external objects if OData is available, giving related lists without code.</li>
<li>Graceful degradation: each panel shows its own error/empty state.</li>
<li>Security: per-user credentials if the external system enforces user-level access.</li></ul>`],
["scenario-110","Senior","scenario",`A Batch job that ran fine for a year now fails with "Non-selective query against large object type" in its start method. Why now?`,
`<p>Data grew past the selectivity thresholds: the filter now returns more than 10%/30% of rows or the object crossed 200k rows (non-selective errors are triggered in trigger contexts; in start() a slow full scan or timeout is more typical, unless the batch query runs inside trigger-invoked code). Also a new filter value or formula field in WHERE can prevent index use. Fix: add an indexed filter (e.g. <code>SystemModstamp &gt; :lastRun</code>), request a custom index, archive old data, or iterate by Id ranges.</p>`],
["scenario-111","Senior","design",`Design a scalable notification system: users subscribe to events (deal won, case escalated) and choose email, Slack or in-app.`,
`<ul><li>Subscription__c (user, event type, channel); preferences UI in LWC.</li>
<li>Business code publishes generic <code>Notification_Event__e</code> (type, record Id, payload).</li>
<li>Event subscriber resolves subscribers in bulk, creates delivery requests per channel.</li>
<li>Dispatchers: Custom Notification (in-app/mobile), Messaging.sendEmail with templates, Slack via Named Credential or Salesforce's Slack actions in Flow.</li>
<li>Rate limiting and digest mode (hourly summary) to avoid spam.</li>
<li>Delivery log for troubleshooting.</li></ul>`],
["scenario-112","Senior","scenario",`After a sandbox refresh, integrations in the sandbox start sending data to production systems. How do you prevent this?`,
`<ul><li>Named Credentials and endpoints are copied from production during refresh; use a post-refresh Apex class (<code>SandboxPostCopy</code> interface) to repoint or disable endpoints, scramble emails, deactivate schedulers.</li>
<li>Email deliverability defaults to "System email only" in new sandboxes — keep it.</li>
<li>Store endpoints in Named Credentials, never hard-coded, and use different credentials per environment.</li>
<li>Checklist in the refresh runbook.</li></ul>
<pre><code>global class PostRefresh implements SandboxPostCopy {
  global void runApexClass(SandboxContext ctx) {
    // e.g. disable integration flags, abort scheduled jobs, mask data
  }
}</code></pre>`],
["scenario-113","Senior","design",`How do you introduce Agentforce (AI agents) into a Service Cloud org safely?`,
`<ul><li>Start with narrow, high-volume topics (order status, password reset) grounded in Knowledge and Salesforce data.</li>
<li>Agent actions: existing invocable Apex and Flows, with explicit input descriptions; actions run with the agent user's permissions, so least privilege matters.</li>
<li>Guardrails: topic instructions, escalation to human via Omni-Channel, Einstein Trust Layer (data masking, zero retention).</li>
<li>Test with Testing Center/utterance sets, monitor conversations, measure deflection and CSAT.</li>
<li>Developers ensure Apex actions are bulk-safe, idempotent and return clear messages.</li></ul>`],
["scenario-114","Senior","scenario",`Sales complains the Opportunity "Amount" is wrong for some deals. Products sum to 10,000 but Amount shows 12,000. What could cause it?`,
`<ul><li>An automation (trigger/flow/integration) writing to Amount directly; when an opportunity has products, Amount should be read-only and calculated.</li>
<li>Product schedules or discounts on line items.</li>
<li>Currency conversion: viewing in a different currency or dated exchange rates.</li>
<li>Quote sync pushing different prices.</li>
<li>Check field history on Amount and the debug log of the update to find who changed it.</li></ul>`],
["scenario-115","Senior","design",`How would you build a configurable "approval matrix" (who approves what based on amount, region and product line) without hard-coding approvers?`,
`<ul><li>Approval_Matrix__c records: region, product line, amount range, approver role or user, step number.</li>
<li>Apex service resolves the approver chain for a record and writes it to fields on the record (Approver_1__c, Approver_2__c) or an Approval_Step__c child list.</li>
<li>Approval process uses "related user" fields for approvers, or Flow Approval Orchestration reads the steps dynamically.</li>
<li>Admin UI: a list view or LWC to maintain the matrix; validation to prevent overlapping ranges.</li></ul>`],
["scenario-116","Senior","scenario",`A partner reports duplicate records created in Salesforce when their system retries API calls after timeouts. How do you fix it?`,
`<ul><li>Make creation idempotent: the partner sends a unique External Id (or idempotency key) and uses <b>upsert</b> instead of insert.</li>
<li>For custom Apex REST: store the request key in a unique field; if it exists, return the original result.</li>
<li>Clean existing duplicates with merge.</li>
<li>Agree on retry policy and timeouts.</li></ul>`],
["scenario-117","Senior","design",`Design Account data quality management for an org where reps and 3 integrations create Accounts.`,
`<ul><li>Matching and Duplicate Rules (alert for reps, block for integrations or let integrations upsert on external ids).</li>
<li>Standardisation: State/Country picklists, validation rules, address verification service via Flow/Apex callout.</li>
<li>Ownership of fields per source (system of record).</li>
<li>Data quality score field and dashboard; scheduled dedupe jobs and merge workflow for stewards.</li>
<li>Integration users bypass UI-only rules but not core data validation.</li></ul>`],
["scenario-118","Senior","scenario",`You inherit an org with 15 triggers on Account, no framework, and 68% coverage. What is your 90-day plan?`,
`<ol><li>Weeks 1–2: inventory automation per object (triggers, flows, workflows), map dependencies and owners; set up source control and CI if missing.</li>
<li>Weeks 3–4: add characterization tests around current behaviour (assert what happens today) for the riskiest objects.</li>
<li>Weeks 5–10: introduce one trigger per object with a handler; move logic from each trigger into handler methods without changing behaviour; deactivate old triggers in the same release.</li>
<li>Weeks 10–12: fix bulkification issues, recursion, remove dead code; raise coverage with meaningful tests.</li>
<li>Throughout: no big-bang; release object by object with monitoring.</li></ol>`],
["scenario-119","Senior","design",`How would you implement GDPR / DPDP "right to be forgotten" for a Contact across Salesforce and connected systems?`,
`<ul><li>Use the Individual object / consent objects to track requests and preferences.</li>
<li>A request record (Privacy_Request__c) drives an orchestrated process: find all related data (Contact, Cases, Emails, Files, Tasks, custom objects, Chatter), decide delete vs anonymise (keep financial records but mask PII).</li>
<li>Batch Apex to anonymise fields and hard delete where required; purge Recycle Bin.</li>
<li>Publish an event so downstream systems erase too; collect confirmations.</li>
<li>Field history and backups: document retention exceptions; Salesforce Privacy Center can automate parts.</li></ul>`],
["scenario-120","Senior","scenario",`A dashboard shows different numbers for two managers looking at the same report. Is it a bug?`,
`<p>Probably not. Dashboards run either as a fixed "running user" or as the "logged-in user" (dynamic). With dynamic dashboards, each viewer sees data per their sharing. Reports also respect sharing. Also check filters like "My team's opportunities", currency (personal currency display), and cached dashboard refresh times.</p>`],
["scenario-121","Senior","design",`Design the data model for a subscription business (plans, add-ons, renewals, usage) on Sales Cloud without CPQ.`,
`<ul><li>Product2 for plans and add-ons with family; Pricebook entries per currency.</li>
<li>Subscription__c (Account, Plan, start/end, status, MRR) with Subscription_Line__c for add-ons.</li>
<li>Opportunity types: New, Upsell, Renewal; Closed Won creates/updates subscriptions via service class.</li>
<li>Usage__c (big volume) aggregated nightly into monthly summaries.</li>
<li>Renewal opportunities generated 90 days before end; MRR rollups to Account.</li>
<li>Consider Revenue Cloud if complexity (proration, amendments) grows.</li></ul>`],
["scenario-122","Senior","scenario",`A user with "Modify All Data" can't edit a record. Why?`,
`<ul><li>Record locked by an approval process (only admins/approvers per settings can edit).</li>
<li>Validation rule or trigger addError blocking specific changes.</li>
<li>Field-level read-only (FLS or page layout read-only, formula/roll-up fields).</li>
<li>Record type not assigned, or the record is in a closed state with Restriction/automation preventing edits.</li>
<li>Locked by a running batch (UNABLE_TO_LOCK_ROW temporarily).</li></ul>`],
["scenario-123","Senior","design",`How would you expose Salesforce Knowledge articles to an external mobile app?`,
`<ul><li>Use REST API (Knowledge Support REST API: <code>/support/knowledgeArticles</code>) with a Connected/External Client App using Client Credentials for public content or user tokens for authenticated content.</li>
<li>Respect channels (public vs customer) and data categories.</li>
<li>Cache articles in the app or a CDN; use LastPublishedDate to refresh.</li>
<li>Alternatively, publish through an Experience Cloud site and use its APIs.</li></ul>`],
["scenario-124","Senior","scenario",`A developer hard-coded a Record Type Id and a queue Id in Apex. Deployment to production fails tests. Explain and fix.`,
`<p>Record Ids differ between orgs (record types and queues created separately). Fix:</p>
<pre><code>Id rt = Schema.SObjectType.Case.getRecordTypeInfosByDeveloperName().get('Complaint').getRecordTypeId();
Id queue = [SELECT Id FROM Group WHERE Type = 'Queue' AND DeveloperName = 'Tier_2'].Id;</code></pre>
<p>Put DeveloperNames in Custom Metadata if they vary; cache the queue lookup.</p>`],
["scenario-125","Senior","design",`What questions do you ask before estimating a new requirement "sync Contacts to our marketing tool"?`,
`<ul><li>Direction (one-way/two-way), which fields, which contacts (filters), volume and frequency (real-time vs nightly).</li>
<li>System of record for consent and email opt-out.</li>
<li>Does the marketing tool have a native Salesforce connector (e.g. Marketing Cloud Connect, HubSpot)?</li>
<li>Identity/keys, dedupe rules, deletes.</li>
<li>Error handling, monitoring owner, API limits on both sides.</li>
<li>Security/compliance (PII, DPDP/GDPR).</li></ul>
<p>Often the right answer is configuring a native connector rather than custom code.</p>`],
["scenario-126","Senior","scenario",`An LWC shows "You don't have access to the Apex class" only for some users after deployment. Fix and prevention?`,
`<p>The Apex controller wasn't added to their profile/permission set (Apex Class Access). Fix by adding it to the feature's permission set. Prevention: ship a permission set per feature in the same deployment containing class access, object/field permissions and custom permissions; automate assignment; include a test running as a user with only that permission set.</p>`],
["scenario-127","Senior","design",`How do you design Apex for a managed or unlocked package that others will extend?`,
`<ul><li>Public/global API surface kept minimal; use <code>global</code> only for what subscribers must call (global can't be removed later in managed packages).</li>
<li>Extension points via interfaces + Custom Metadata (subscribers register their class name).</li>
<li>Avoid hard dependencies on optional features (check with describe or feature flags).</li>
<li>Namespace-aware dynamic SOQL and field names.</li>
<li>Version the API; deprecate with <code>@Deprecated</code> in managed packages.</li></ul>`],
["scenario-128","Senior","scenario",`A Flow sends 5,000 emails when an admin mass-updates records. How do you prevent accidental mass notifications?`,
`<ul><li>Entry criteria "only when updated to meet the condition" and specific field changes.</li>
<li>Bypass custom permission assigned to admins/data loaders and checked in entry conditions.</li>
<li>For mass operations, a "Suppress_Notifications__c" field set by the admin tool.</li>
<li>Use scheduled paths / digest emails instead of immediate per-record emails.</li>
<li>Test with Data Loader in sandbox before production changes.</li></ul>`],
["scenario-129","Senior","design",`Design a data archiving and restore process for Cases older than 3 years, where agents occasionally need to view archived cases.`,
`<ul><li>Nightly batch moves closed cases older than 3 years (with comments and email messages summarized) into a Big Object or external store, keeping key fields searchable (Case number, Account, Contact, dates).</li>
<li>Files moved to external storage (Files Connect or blob storage), links kept.</li>
<li>Hard delete originals after verification.</li>
<li>LWC "Archived Cases" on Account/Contact pages queries the big object by index; a restore action recreates a Case if needed.</li>
<li>Reports for compliance from the archive store.</li></ul>`],
["scenario-130","Senior","scenario",`In an interview you're asked: "What would you do differently in your last project?" How do you answer well?`,
`<p>Pick one or two concrete technical decisions, explain the context and constraint at the time, what happened, and what you'd do now. Examples: introducing a trigger framework earlier; building integration error handling and monitoring from day one instead of after incidents; using permission sets instead of profiles; investing in a test data factory. Show learning and judgement, not blame.</p>`]
]);
