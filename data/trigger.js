SF.add("trigger", [
["trigger-101","Senior","output",`A before-update trigger on Account sets <code>Description = 'X'</code>. A workflow field update then changes Rating. How many times does the trigger run and what is in Trigger.old the second time?`,
`<p>The before and after update triggers run <b>twice</b>: once for the user's save and once more after the workflow field update (only one additional time, regardless of how many field updates). On the second run, <code>Trigger.old</code> still holds the values from <b>before the original save</b>, not the values after the first trigger run. So "field changed" checks evaluate the same as in the first run, which is why a naive "if Status changed then create task" can create duplicates.</p>
<p>Same re-entry happens with record-triggered flows that update the same record in after-save (they cause a re-save with triggers).</p>`],
["trigger-102","Senior","concept",`Why is a static Boolean recursion flag dangerous and what is a better pattern?`,
`<ul><li>Bulk loads of 1,000 records run the trigger in chunks of 200 within the <b>same transaction</b> (Apex DML) — the flag set by chunk 1 skips chunks 2–5.</li>
<li>Partial-success retries re-run the trigger; the flag skips the retry.</li>
<li>Workflow/flow re-saves are legitimately skipped even when they changed relevant fields.</li></ul>
<p>Better: track processed Ids per operation in a static <code>Map&lt;String, Set&lt;Id&gt;&gt;</code> keyed by context, and primarily rely on <b>change detection</b> against <code>oldMap</code> so re-entry is harmless (idempotent logic).</p>`],
["trigger-103","Mid","concept",`Can a trigger on one object update records of the same object? What are the risks?`,
`<p>Yes, but only in an after trigger via DML (or in before trigger by modifying <code>Trigger.new</code> for the same records). Updating <b>other</b> records of the same object in an after trigger fires the same trigger again for those records — recursion risk. Also you can't do DML on the records currently in <code>Trigger.new</code> in a before trigger, and updating them by Id in an after trigger causes a re-save (and potential infinite loop). Use change detection plus an Id-based recursion guard; for hierarchies (parent account rollups) process level by level.</p>`],
["trigger-104","Senior","concept",`How do you handle delete in triggers for objects with master-detail children?`,
`<ul><li>Deleting a master cascades to details; the detail records' delete triggers <b>do not fire</b>.</li>
<li>If logic depends on detail deletion (e.g. rollup to a grandparent or cleaning integration data), handle it in the master's <code>before delete</code> trigger: query children there because after the delete they're gone.</li>
<li>Undelete restores children with the parent; again only the master's undelete trigger fires.</li></ul>`],
["trigger-105","Mid","concept",`What can and can't you do in each trigger context?`,
`<div class="tbl"><table><tr><th>Context</th><th>Modify Trigger.new fields</th><th>DML on Trigger.new records</th><th>Ids available</th></tr>
<tr><td>before insert</td><td>Yes</td><td>Not allowed</td><td>No</td></tr>
<tr><td>after insert</td><td>No (read-only)</td><td>Yes (causes update)</td><td>Yes</td></tr>
<tr><td>before update</td><td>Yes</td><td>Not allowed</td><td>Yes</td></tr>
<tr><td>after update</td><td>No</td><td>Yes (re-entry)</td><td>Yes</td></tr>
<tr><td>before delete</td><td>N/A (Trigger.old only)</td><td>—</td><td>Yes</td></tr>
<tr><td>after delete</td><td>N/A</td><td>Can't update deleted records</td><td>Yes</td></tr>
<tr><td>after undelete</td><td>No</td><td>Yes</td><td>Yes</td></tr></table></div>`],
["trigger-106","Senior","design",`How do you decide the order of operations inside a handler when multiple features share one trigger?`,
`<ul><li>Before context: defaults and derivations first, then validations (validate final values), then any field stamping that depends on validated data.</li>
<li>After context: same-object follow-ups, then child/related record creation, then parent rollups, then async/integration enqueues last (so they see final committed state).</li>
<li>Express order explicitly: either a fixed sequence in the handler or Custom Metadata with an Order field.</li>
<li>Each feature filters its own relevant records first, so one feature's work doesn't cost others CPU.</li></ul>`],
["trigger-107","Mid","code",`Write a before-insert trigger that sets a sequential, gap-free invoice number per Account.`,
`<pre><code>// before insert on Invoice__c
Set&lt;Id&gt; accIds = new Set&lt;Id&gt;();
for (Invoice__c i : (List&lt;Invoice__c&gt;) Trigger.new) accIds.add(i.Account__c);
Map&lt;Id, Account&gt; accs = new Map&lt;Id, Account&gt;(
  [SELECT Id, Last_Invoice_No__c FROM Account WHERE Id IN :accIds FOR UPDATE]);  // lock counters
for (Invoice__c i : (List&lt;Invoice__c&gt;) Trigger.new) {
  Account a = accs.get(i.Account__c);
  Integer next = (a.Last_Invoice_No__c == null ? 0 : a.Last_Invoice_No__c.intValue()) + 1;
  a.Last_Invoice_No__c = next;
  i.Invoice_No__c = 'INV-' + String.valueOf(next).leftPad(6, '0');
}
update accs.values();</code></pre>
<p><code>FOR UPDATE</code> prevents two concurrent transactions from issuing the same number. Auto-number fields are simpler but are org-wide, not per-account, and can have gaps after rollbacks.</p>`],
["trigger-108","Senior","concept",`What is the difference between addError on Trigger.new and throwing an exception in a trigger?`,
`<ul><li><code>record.addError()</code> marks only that record as failed; with partial-success DML the others save. Message shown cleanly in UI; supports field-level errors.</li>
<li>Throwing an unhandled exception fails the <b>whole</b> DML operation for all records and shows a stack-trace-like message ("Apex trigger X caused an unexpected exception").</li></ul>
<p>Prefer addError for validation. Use <code>addError(msg, false)</code> only when you deliberately output safe HTML (escaping is on by default).</p>`],
["trigger-109","Senior","scenario",`A trigger works in the UI but fails during a 50,000-record Data Loader import with CPU limit. Why only then?`,
`<ul><li>In the UI the trigger sees 1 record; in a load it sees 200 per invocation. Logic that is O(n²) (nested loops over records and related rows) is invisible with 1 record and lethal with 200.</li>
<li>Per-record work that was cheap (a describe call, a JSON parse, a regex) is now multiplied by 200 in one CPU budget.</li>
<li>Related automation (flows, rollups, sharing recalculation) multiplies cost under load.</li>
<li>Fix by profiling with 200-record test, removing nested loops, filtering only changed records, bypassing non-essential automation for the integration user, and reducing Data Loader batch size.</li></ul>`],
["trigger-110","Mid","concept",`How do you write a trigger on a standard object that doesn't support all events (e.g. Attachment, ContentDocumentLink, FeedItem)?`,
`<p>Check supported events: ContentDocumentLink supports insert/delete triggers (no update in many cases); ContentVersion supports insert/update; FeedItem supports insert/update/delete. Typical pattern: on <code>ContentDocumentLink</code> after insert, check <code>LinkedEntityId.getSObjectType()</code> to see which record a file was attached to, then update a "Has Files" flag on that record. Some objects (e.g. Task with recurrence, OpportunityContactRole historically) have quirks — mention you check the object reference for "triggers supported".</p>`],
["trigger-111","Senior","code",`Write a trigger that prevents a user from changing an Opportunity's Amount after it is Closed Won, except Finance users, and logs who attempted it.`,
`<pre><code>// before update on Opportunity
Boolean finance = FeatureManagement.checkPermission('Edit_Closed_Deals');
List&lt;Audit_Log__c&gt; logs = new List&lt;Audit_Log__c&gt;();
for (Opportunity o : (List&lt;Opportunity&gt;) Trigger.new) {
  Opportunity old = (Opportunity) Trigger.oldMap.get(o.Id);
  if (old.StageName == 'Closed Won' &amp;&amp; o.Amount != old.Amount &amp;&amp; !finance) {
    o.Amount.addError('Amount is locked after Closed Won. Contact Finance.');
    logs.add(new Audit_Log__c(Record_Id__c = o.Id, User__c = UserInfo.getUserId(),
      Detail__c = 'Tried ' + old.Amount + ' to ' + o.Amount));
  }
}
if (!logs.isEmpty()) EventBus.publish(AuditEvents.toEvents(logs)); // platform event survives rollback</code></pre>
<p>Inserting the log with DML would be rolled back together with the failed save, so publish a platform event with "Publish Immediately" behaviour and create the log in the event subscriber.</p>`],
["trigger-112","Mid","concept",`Can you call a Queueable from a trigger? What are the pitfalls?`,
`<p>Yes. Pitfalls: enqueuing once per record (limit 50 per transaction) — enqueue one job with all Ids; when the trigger itself runs inside a Queueable, only 1 child job can be enqueued; during Batch execution you can enqueue only 1 Queueable per execute; Data Loader runs the trigger per 200-chunk, so a 10,000-row load can try to enqueue 50 jobs in one batch transaction. Guard with a static "already enqueued" set and use <code>Limits.getQueueableJobs()</code>.</p>`],
["trigger-113","Senior","concept",`How do Flows and triggers share the same transaction, and how do limits combine?`,
`<p>Record-triggered flows, Apex triggers, process automation and managed package code all run in the <b>same transaction</b> and share governor limits (SOQL, DML, CPU). A flow with a Get Records inside a loop can consume your trigger's SOQL budget. Before-save flows run before before-triggers; after-save flows run after after-triggers. Flows are bulkified by the engine across interviews, but elements inside loops still multiply. When diagnosing limit errors, the debug log shows FLOW_ELEMENT and CODE_UNIT lines for both.</p>`],
["trigger-114","Mid","code",`On Case insert, if the Contact has another open Case created in the last 24 hours with the same Subject, link the new case as a child (ParentId).`,
`<pre><code>// before insert on Case
Set&lt;Id&gt; contactIds = new Set&lt;Id&gt;();
for (Case c : newList) if (c.ContactId != null &amp;&amp; c.Subject != null) contactIds.add(c.ContactId);
if (contactIds.isEmpty()) return;
Map&lt;String, Id&gt; existing = new Map&lt;String, Id&gt;();
for (Case e : [SELECT Id, ContactId, Subject FROM Case WHERE ContactId IN :contactIds
     AND IsClosed = false AND CreatedDate = LAST_N_DAYS:1 ORDER BY CreatedDate]) {
  String k = e.ContactId + '|' + e.Subject.toLowerCase();
  if (!existing.containsKey(k)) existing.put(k, e.Id);   // keep oldest
}
for (Case c : newList) {
  if (c.ContactId == null || c.Subject == null) continue;
  Id parent = existing.get(c.ContactId + '|' + c.Subject.toLowerCase());
  if (parent != null) c.ParentId = parent;
}</code></pre>
<p><code>LAST_N_DAYS:1</code> covers yesterday and today, not exactly 24 hours; for an exact window bind <code>System.now().addHours(-24)</code>. Also discuss duplicates within the same insert batch.</p>`],
["trigger-115","Senior","concept",`How do you unit-test a trigger handler without DML?`,
`<ul><li>Keep logic in methods that take lists/maps as parameters: <code>OpportunityDomain.applyDefaults(List&lt;Opportunity&gt; newList)</code>.</li>
<li>Build records in memory, with fake Ids from a small generator (prefix from <code>Opportunity.SObjectType.getDescribe().getKeyPrefix()</code> plus a padded counter, as fflib_IDGenerator does), and call the method directly.</li>
<li>Inject selectors so queries return in-memory data (Stub API).</li>
<li>Keep one integration test per trigger with real DML to cover the wiring.</li></ul>
<p>Result: tests run in milliseconds and don't break when unrelated validation rules change.</p>`],
["trigger-116","Mid","concept",`What does Trigger.isExecuting tell you and when is it useful?`,
`<p><code>Trigger.isExecuting</code> is true when the current code is running in a trigger context (including code called from a trigger). Useful in shared utilities to decide whether they can rely on <code>Trigger.new</code> or must query, or to defer work to async when in trigger context. Combine with <code>System.isBatch()</code>, <code>isFuture()</code>, <code>isQueueable()</code> for context-aware behaviour.</p>`],
["trigger-117","Senior","scenario",`A trigger on User fails with MIXED_DML when it updates Contacts. What are your options?`,
`<p>User is a setup object; updating Contacts (non-setup) in the same transaction fails. Options: move the Contact update into a Queueable/<code>@future</code> enqueued from the User trigger; publish a platform event and update Contacts in its subscriber; or move the logic to an after-save flow with a scheduled/async path. In tests, use <code>System.runAs</code> to separate setup DML.</p>`],
["trigger-118","Mid","concept",`What happens if you have two triggers on the same object for the same event?`,
`<p>Both run, but the order is <b>not guaranteed</b>. That's why the best practice is one trigger per object delegating to a handler with an explicit order. Managed package triggers also run on the same object and their order relative to yours isn't controllable.</p>`],
["trigger-119","Senior","code",`When an Account's Owner changes, transfer its open Opportunities and open Cases to the new owner, but not records owned by queues.`,
`<pre><code>// after update on Account
Map&lt;Id, Id&gt; newOwnerByAcc = new Map&lt;Id, Id&gt;();
for (Account a : newList) if (a.OwnerId != oldMap.get(a.Id).OwnerId) newOwnerByAcc.put(a.Id, a.OwnerId);
if (newOwnerByAcc.isEmpty()) return;
List&lt;SObject&gt; toUpdate = new List&lt;SObject&gt;();
for (Opportunity o : [SELECT Id, AccountId FROM Opportunity WHERE AccountId IN :newOwnerByAcc.keySet()
     AND IsClosed = false]) {
  toUpdate.add(new Opportunity(Id = o.Id, OwnerId = newOwnerByAcc.get(o.AccountId)));
}
for (Case c : [SELECT Id, AccountId, OwnerId FROM Case WHERE AccountId IN :newOwnerByAcc.keySet()
     AND IsClosed = false]) {
  if (c.OwnerId.getSObjectType() == User.SObjectType)   // skip queue-owned
    toUpdate.add(new Case(Id = c.Id, OwnerId = newOwnerByAcc.get(c.AccountId)));
}
update toUpdate;</code></pre>
<p>Note the native Account owner change in UI already offers to transfer open opportunities; via API it doesn't, which is why such triggers exist. For accounts with thousands of children, push to a Queueable.</p>`],
["trigger-120","Senior","concept",`How do Change Data Capture triggers differ from normal triggers?`,
`<p>CDC triggers (<code>trigger X on AccountChangeEvent (after insert)</code>) run <b>asynchronously after commit</b>, as the Automated Process user, in batches up to 2,000 events. They don't block the user's save and can't use addError. Use them for post-commit processing like syncing, heavy recalculations, or audit, separating it from the user's transaction. Read <code>EventBus.ChangeEventHeader</code> for changeType, recordIds and changedFields.</p>`]
]);
