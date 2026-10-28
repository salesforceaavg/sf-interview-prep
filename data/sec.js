SF.add("sec", [
["sec-101","Senior","scenario",`A Sales user can see an Opportunity but gets "insufficient access rights on cross-reference id" when saving it. What does that mean?`,
`<p>The record itself is editable, but a <b>lookup value</b> being saved points to a record the user can't access (or doesn't have the right access to), e.g. setting <code>AccountId</code> to an Account they can't read, a Pricebook they can't see, a Campaign, or a record type unavailable to them. Also appears when creating a share or assigning an owner/queue the user can't reference. Check each lookup on the save and the user's access to those targets.</p>`],
["sec-102","Senior","concept",`How does the sharing mode of a class get determined when classes call each other?`,
`<ul><li>A class declared <code>with sharing</code> / <code>without sharing</code> always runs in that mode for its own methods.</li>
<li><code>inherited sharing</code> runs in the caller's mode; if it's the entry point (e.g. an <code>@AuraEnabled</code> method), it runs with sharing.</li>
<li>A class with <b>no keyword</b> runs in the caller's mode; as an entry point it generally runs <b>without</b> sharing, except <code>@AuraEnabled</code> controllers called from Lightning components, which default to with sharing. Being explicit avoids the ambiguity.</li>
<li>Inner classes don't inherit the outer class's keyword unless declared.</li>
<li>Triggers run in system context (without sharing).</li></ul>`],
["sec-103","Mid","concept",`What's the difference between "View All" / "Modify All" on an object and "View All Data" / "Modify All Data"?`,
`<ul><li><b>Object-level View All / Modify All</b>: bypass sharing for one object (and Modify All lets users delete/transfer any record of it).</li>
<li><b>View All Data / Modify All Data</b>: system permissions bypassing sharing for <b>all</b> objects, plus admin abilities. Modify All Data is very powerful; avoid for integration users where possible.</li>
<li>"View All Records" in permission sets is the same as object View All.</li></ul>`],
["sec-104","Senior","design",`Design sharing for a bank where relationship managers see only their own clients, team leads see their team's, and compliance sees all, with 5 million Accounts.`,
`<ul><li>Account OWD Private; role hierarchy: Compliance (or View All on Account via permission set) at a level not above everyone, Team Lead → RM.</li>
<li>RMs own their Accounts; team leads see via hierarchy.</li>
<li>Compliance: object-level View All on Account/related objects via permission set — avoids huge sharing tables.</li>
<li>Avoid criteria-based sharing rules on 5M rows where possible (recalculation cost); avoid ownership skew (no single user owning &gt;10k).</li>
<li>Consider Restriction Rules for sensitive record types; Shield encryption for PII; Event Monitoring for exports.</li></ul>`],
["sec-105","Senior","concept",`How do Teams (Account Teams, Opportunity Teams, Case Teams) affect sharing?`,
`<p>Team members get access per member row (Read or Read/Write for the record, plus access to related opportunities/cases for Account teams). Under the hood, they create share rows with RowCause Team. Default teams can be auto-added when a user creates a record. Teams are good for collaborative selling without changing ownership; with many members per record, they increase sharing table size.</p>`],
["sec-106","Mid","concept",`What is a Permission Set License and how is it different from a Permission Set?`,
`<p>A Permission Set License (PSL) is an entitlement that unlocks features beyond the user license (e.g. Sales Cloud Einstein, CRM Analytics, Field Service). You assign the PSL to the user, then assign permission sets that grant the actual permissions. A permission set alone can't grant features the user isn't licensed for.</p>`],
["sec-107","Senior","concept",`How do you prevent SOQL injection when the object and field names are dynamic?`,
`<ul><li>Never concatenate raw identifiers. Validate object names with <code>Schema.getGlobalDescribe().containsKey(name)</code> and field names against <code>describe.fields.getMap()</code>.</li>
<li>Use bind variables (<code>Database.queryWithBinds</code>) for all values.</li>
<li>Whitelist allowed operators and sort directions (<code>ASC</code>/<code>DESC</code>) explicitly.</li>
<li>Run in <code>USER_MODE</code> so even a valid but unauthorized field fails.</li>
<li><code>String.escapeSingleQuotes</code> protects only string literals — not identifiers or numbers.</li></ul>`],
["sec-108","Mid","concept",`What is MFA enforcement in Salesforce and how does it affect integrations?`,
`<p>MFA is required for all direct UI logins (contractually, and auto-enabled). SSO users can satisfy MFA at the identity provider. API-only integration users are exempt when using OAuth flows without UI login (JWT, Client Credentials). Username-password OAuth flows and security tokens are discouraged; migrate them.</p>`],
["sec-109","Senior","concept",`What is Shield Platform Encryption's impact on development?`,
`<ul><li>Encrypted fields with probabilistic encryption can't be used in WHERE, ORDER BY, GROUP BY or as External Ids; deterministic encryption allows equality filters (case-sensitive or insensitive).</li>
<li>Some features don't support encrypted fields (formula references, roll-ups in some cases, certain search behaviours).</li>
<li>Apex sees decrypted values if the user has access; no code changes for basic CRUD.</li>
<li>Test queries in a sandbox with encryption enabled; key rotation and background re-encryption planning.</li></ul>`],
["sec-110","Mid","concept",`How do you give a user temporary elevated access safely?`,
`<p>Assign a permission set with an <b>expiration date</b> (Permission Set Assignment ExpirationDate), or use Permission Set Groups with session-based permission sets activated only after an extra step (e.g. MFA or a flow). Log the assignment and review with Setup Audit Trail.</p>`],
["sec-111","Senior","scenario",`An Experience Cloud guest user form inserts Cases with Apex. After a security review, guests can't create records. How do you redesign?`,
`<ul><li>Since Winter '21, guest users can't own records and records they create are owned by a default internal owner; OWD for guests is Private.</li>
<li>Give the guest profile Create on Case, Apex class access for the controller, and keep FLS minimal.</li>
<li>Apex runs <code>with sharing</code>; inserting is allowed with create permission; avoid returning record data to guests.</li>
<li>Add reCAPTCHA / rate limiting, validate inputs server side.</li>
<li>Alternatively use a Screen Flow exposed to guests or Web-to-Case.</li></ul>`],
["sec-112","Mid","concept",`What's the difference between profile login IP ranges and network access trusted IPs?`,
`<ul><li><b>Profile login IP ranges</b>: users outside the range <b>can't log in</b> (strict restriction).</li>
<li><b>Network Access trusted IP ranges</b>: users inside skip identity verification challenges; outside they can still log in after verification.</li></ul>`],
["sec-113","Senior","concept",`How do you audit who exported data or viewed sensitive records?`,
`<ul><li>Event Monitoring log files: ReportExport, API, BulkApi, LightningPageView, URI events.</li>
<li>Real-Time Event Monitoring: ReportEvent, ListViewEvent, ApiEvent stored in big objects; Transaction Security Policies to block or notify (e.g. block export &gt; 10,000 rows).</li>
<li>Field Audit Trail for changes, Setup Audit Trail for config.</li>
<li>Login History and Identity Verification History.</li></ul>`],
["sec-114","Mid","concept",`What are Implicit sharing vs explicit sharing and the "Grant Access Using Hierarchies" setting?`,
`<p>Explicit sharing is configured (rules, manual, teams, Apex). Implicit is automatic parent/child access. "Grant Access Using Hierarchies" (on by default, can be disabled only for custom objects) determines whether managers inherit their subordinates' record access. Disabling it is useful for objects like HR cases where managers must not see subordinates' records.</p>`],
["sec-115","Senior","code",`Write a method that returns Contacts to an LWC, hides fields the user can't read, and reports which fields were removed.`,
`<pre><code>@AuraEnabled(cacheable=true)
public static Map&lt;String, Object&gt; getContacts(Id accountId) {
  List&lt;Contact&gt; raw = [SELECT Id, Name, Email, Phone, Salary__c FROM Contact WHERE AccountId = :accountId];
  SObjectAccessDecision d = Security.stripInaccessible(AccessType.READABLE, raw);
  return new Map&lt;String, Object&gt;{
    'records' =&gt; d.getRecords(),
    'removedFields' =&gt; d.getRemovedFields().get('Contact')   // Set&lt;String&gt; or null
  };
}</code></pre>
<p>The query runs in system mode (sharing per class keyword), then FLS is applied. Unlike <code>WITH USER_MODE</code>, it doesn't throw, so the UI can hide columns gracefully.</p>`]
]);
