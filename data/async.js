SF.add("async", [
["async-101","Senior","output",`A Batch class has an instance variable <code>Integer total = 0;</code> incremented in execute(). It doesn't implement Database.Stateful. 1,000 records, scope 200. What is <code>total</code> in finish()?`,
`<p><b>0.</b> Without <code>Database.Stateful</code>, the batch object is deserialized fresh for each execute() and for finish(), so instance changes made in execute() are lost. Implement <code>Database.Stateful</code> to carry the value (it would then be 1,000). Static variables are also reset between chunks, so they're not a workaround.</p>`],
["async-102","Senior","concept",`What happens to a Batch job when one execute() chunk throws an unhandled exception?`,
`<p>That chunk's transaction rolls back; the job <b>continues</b> with the next chunks. <code>AsyncApexJob.NumberOfErrors</code> increments and <code>ExtendedStatus</code> holds the first error. finish() still runs. To capture failed records reliably:</p>
<ul><li>Use <code>Database.update(scope, false)</code> and log per-record errors.</li>
<li>Implement <code>Database.RaisesPlatformEvents</code>: the platform publishes <code>BatchApexErrorEvent</code> for unhandled exceptions, including the scope Ids, which a trigger can log or retry.</li></ul>`],
["async-103","Senior","code",`Implement retry for failed batch chunks using BatchApexErrorEvent.`,
`<pre><code>public class InvoiceBatch implements Database.Batchable&lt;SObject&gt;, Database.RaisesPlatformEvents {
  public Database.QueryLocator start(Database.BatchableContext bc) {
    return Database.getQueryLocator([SELECT Id FROM Invoice__c WHERE Status__c = 'Pending']);
  }
  public void execute(Database.BatchableContext bc, List&lt;Invoice__c&gt; scope) { InvoiceService.post(scope); }
  public void finish(Database.BatchableContext bc) {}
}

trigger BatchErrors on BatchApexErrorEvent (after insert) {
  List&lt;Batch_Error__c&gt; logs = new List&lt;Batch_Error__c&gt;();
  for (BatchApexErrorEvent e : Trigger.new) {
    logs.add(new Batch_Error__c(Job_Id__c = e.AsyncApexJobId, Records__c = e.JobScope,
      Message__c = e.Message, Type__c = e.ExceptionType, Phase__c = e.Phase));
  }
  insert logs;   // a scheduled job re-runs failed scopes with a retry counter
}</code></pre>`],
["async-104","Mid","concept",`What are the main async limits you must remember?`,
`<ul><li>250,000 async Apex executions per 24 hours (or licenses × 200, whichever is greater): batch execute calls, queueables, futures, schedulables all count.</li>
<li>50 <code>@future</code> calls and 50 <code>System.enqueueJob</code> per synchronous transaction; 1 child enqueue from a Queueable.</li>
<li>5 concurrent batch jobs in Processing; 100 in the Flex Queue.</li>
<li>100 scheduled Apex jobs.</li>
<li>Async transactions: 200 SOQL, 12 MB heap, 60 s CPU.</li></ul>`],
["async-105","Senior","design",`Design a robust asynchronous callout framework for many integrations.`,
`<ul><li><b>Request object</b> <code>Integration_Request__c</code>: endpoint key, payload, status (Queued, Sent, Failed, Dead), attempts, next retry time, correlation id.</li>
<li><b>Producer</b>: business code inserts requests (cheap DML, no callout constraints, works from triggers).</li>
<li><b>Dispatcher</b> Queueable with <code>AllowsCallouts</code> picks a bounded batch (e.g. 50) ordered by priority, uses <code>FOR UPDATE</code> or status flip to avoid double processing, calls a handler per type via an interface resolved from Custom Metadata.</li>
<li><b>Finalizer</b> re-enqueues the dispatcher if work remains or if the job crashed; exponential backoff via <code>AsyncOptions.MinimumQueueableDelayInMinutes</code>.</li>
<li><b>Dead-letter</b> after N attempts with an alert; LWC console to replay.</li>
<li>Named Credentials per endpoint; idempotency key sent in a header.</li></ul>`],
["async-106","Mid","concept",`Can you pass sObjects to a Queueable and what's the gotcha?`,
`<p>Yes, Queueable members can be sObjects and collections. Gotcha: they are serialized at enqueue time — the values are a <b>snapshot</b>. If records may change before execution (or you need fields not loaded), re-query by Id inside execute(). Also large payloads increase serialization cost; pass Ids for big data sets.</p>`],
["async-107","Senior","concept",`How do you call Batch Apex from another Batch or from a Queueable, and what's allowed?`,
`<ul><li>From a batch's <code>finish()</code>: <code>Database.executeBatch(new NextBatch())</code> — standard chaining.</li>
<li>From <code>execute()</code>: you can't start another batch (exception); you can enqueue one Queueable.</li>
<li>From a Queueable: you can call <code>Database.executeBatch</code>.</li>
<li>From a <code>@future</code>: you can't call executeBatch or another future.</li>
<li>From a Schedulable: yes, the usual pattern.</li></ul>`],
["async-108","Mid","code",`Schedule a job every 15 minutes. Why can't you just use one cron expression?`,
`<p>In Apex cron expressions the Seconds and Minutes fields accept only a single value (no <code>*/15</code>), so one scheduled job runs at most once an hour. Schedule four jobs:</p>
<pre><code>for (Integer m : new List&lt;Integer&gt;{0, 15, 30, 45}) {
  System.schedule('Sync at :' + m, '0 ' + m + ' * * * ?', new SyncScheduler());
}</code></pre>
<p>Alternative: a self-rescheduling Queueable with <code>AsyncOptions</code> delay (max 10 minutes), or a scheduled-triggered Flow for simpler needs.</p>`],
["async-109","Senior","scenario",`A Queueable chain stopped silently in production. How do you find out what happened and prevent it next time?`,
`<ul><li>Query <code>AsyncApexJob</code> for the class: Status Failed/Aborted, ExtendedStatus.</li>
<li>Check Apex exception emails (Setup → Apex Exception Email recipients).</li>
<li>Likely causes: uncatchable limit exception, a child enqueue skipped due to <code>Test.isRunningTest</code>-style guard or a condition, depth limit, async daily limit reached.</li>
<li>Prevention: attach a <code>Finalizer</code> to each link to log and re-enqueue on failure; persist progress (last processed Id) in a record so a new chain can resume; monitor with a scheduled health check.</li></ul>`],
["async-110","Mid","concept",`What is the difference between Platform Events "Publish After Commit" and "Publish Immediately"?`,
`<ul><li><b>Publish After Commit</b>: event is published only if the transaction commits. Use for business events (order created) so subscribers don't act on rolled-back data.</li>
<li><b>Publish Immediately</b>: published right away, even if the transaction later fails. Use for logging and error reporting.</li></ul>
<p>Set on the event definition. With publish-after-commit, <code>EventBus.publish</code> returns success before actual publishing.</p>`],
["async-111","Senior","concept",`How do Platform Event triggers handle failures, retries and batch size?`,
`<ul><li>Run as Automated Process user (configurable via PlatformEventSubscriberConfig to a specific user and batch size).</li>
<li>Default batch up to 2,000 events.</li>
<li>Throw <code>EventBus.RetryableException</code> to have the batch redelivered (up to 9 retries), the trigger then becomes suspended.</li>
<li>Use <code>EventBus.TriggerContext.currentContext().setResumeCheckpoint(replayId)</code> to mark processed events, so after an error only unprocessed events are redelivered.</li>
<li>Suspended subscriptions can be resumed in Setup.</li></ul>`],
["async-112","Mid","concept",`When would you use a @future method today, if Queueable is better?`,
`<p>Rarely: simple fire-and-forget with primitive params, especially to escape mixed DML from a setup object trigger, or legacy code. Everything new should use Queueable (monitoring, sObject params, chaining, finalizers). Note you can't call a future from a future or batch, which often breaks when a trigger fires inside async context.</p>`],
["async-113","Senior","design",`How would you process 2 million records where each record needs a callout and the external API allows 10 requests per second?`,
`<ul><li>Throttle outside Salesforce if possible: push events to middleware (MuleSoft/AWS) which rate-limits.</li>
<li>Inside Salesforce: Batch Apex with scope sized to the rate (e.g. 50 callouts per execute) and serial chaining of Queueables with delay; Salesforce can't sleep, so throughput is controlled by scope size and delays.</li>
<li>Bulk endpoint: ask the API owner for a bulk endpoint; 2M single calls is ~55 hours at 10/s.</li>
<li>Track status per record, idempotent retries.</li>
<li>Check daily async limit (250k) — 2M Queueable executions won't fit; batch execute counts per chunk.</li></ul>`],
["async-114","Mid","concept",`How do you monitor and abort async jobs?`,
`<p>Setup → Apex Jobs, Scheduled Jobs, Apex Flex Queue. In code: query <code>AsyncApexJob</code> (Status, JobItemsProcessed, TotalJobItems, NumberOfErrors) and <code>CronTrigger</code> (scheduled). Abort with <code>System.abortJob(jobId)</code> (works for batch, queueable, scheduled via CronTrigger Id).</p>`],
["async-115","Senior","concept",`What is the Queueable "deduplication signature" and when do you use it?`,
`<p><code>AsyncOptions.DuplicateSignature</code> (built with <code>QueueableDuplicateSignature.Builder</code>) prevents enqueuing a second Queueable with the same signature while one is pending or running. Enqueuing a duplicate throws <code>DuplicateMessageException</code>, which you catch. Use it for "recalculate account X" jobs triggered by many child changes so only one runs per account.</p>
<pre><code>AsyncOptions o = new AsyncOptions();
o.DuplicateSignature = QueueableDuplicateSignature.Builder()
  .addString('RecalcAccount').addId(accId).build();
try { System.enqueueJob(new RecalcAccount(accId), o); }
catch (DuplicateMessageException e) { /* already queued */ }</code></pre>`],
["async-116","Mid","output",`What happens if you call <code>System.enqueueJob</code> inside a for loop for 60 records in a trigger?`,
`<p>The 51st call throws <code>System.LimitException: Too many queueable jobs added to the queue: 51</code>, and the whole transaction fails (limit exceptions can't be caught). Fix: collect Ids and enqueue one job.</p>`],
["async-117","Senior","concept",`What is the difference between Scheduled Flow, Scheduled Apex and a scheduled path in a record-triggered flow?`,
`<ul><li><b>Schedule-triggered flow</b>: runs on a schedule over records matching a filter; bulk-processed in batches (each batch of 200 is its own transaction) — good for simple nightly updates.</li>
<li><b>Scheduled path</b>: per-record, runs X time after a date field or record change (e.g. 3 days after CloseDate); replaces time-based workflow.</li>
<li><b>Scheduled Apex</b>: full control, typically launching a batch, for complex/large or integration processing.</li></ul>`],
["async-118","Mid","concept",`How do you get the Id of the job and pass state to the next job in a chain?`,
`<p><code>System.enqueueJob</code> returns the job Id; inside execute, <code>ctx.getJobId()</code>. Pass state through the next job's constructor (e.g. remaining Ids, cursor position, counters). For long chains persist the cursor in a record so a restart can continue.</p>`],
["async-119","Senior","scenario",`Batch jobs are queued for hours in the Flex Queue. What could be wrong?`,
`<ul><li>5 batches already Processing (long-running nightly jobs, managed packages).</li>
<li>Org's daily async limit consumed.</li>
<li>Jobs waiting on resource-heavy queues during a Salesforce maintenance/instance load.</li>
<li>Fix: stagger schedules, reduce long batches, reorder the flex queue, consolidate small batches into Queueables, review managed package jobs.</li></ul>`],
["async-120","Senior","concept",`Explain Apex Cursors and when they're better than Batch Apex.`,
`<p>Apex Cursors (<code>Database.getCursor(query)</code>) let you fetch large SOQL result sets in pieces (<code>cursor.fetch(position, count)</code>) across multiple transactions, typically from chained Queueables. Benefits over Batch: no 5-concurrent-batch limit, flexible chunk size per step, can move backwards/forwards, and works naturally with Queueable chaining. Limits apply to cursor rows and fetch calls per day/transaction, so check current docs. Use for large processing where Batch's fixed structure is limiting.</p>`]
]);
