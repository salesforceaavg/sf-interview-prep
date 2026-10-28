SF.add("dml", [
["dml-101","Senior","output",`You insert 5 Accounts with <code>Database.insert(list, false)</code>. Record 3 fails a validation rule. A before-insert trigger counts calls in a static variable. What is the final count and which records are saved?`,
`<p>Records 1, 2, 4, 5 are saved. With partial success, Salesforce runs the batch, rolls back, removes the failing records, and <b>retries the save with the remaining records up to two more times</b>. So the trigger can execute <b>more than once</b> (here typically 2 times), and static variables are not reset between the attempts.</p>
<p>Implications: don't count on static counters or one-time static flags being accurate with partial-success DML; make trigger logic idempotent; don't make callouts/enqueue jobs blindly in before triggers.</p>`],
["dml-102","Mid","concept",`What is the difference between Database.update with AllOrNone=false and a try/catch around update?`,
`<ul><li><code>try { update list; } catch (DmlException e)</code>: one failing record rolls back the whole statement; nothing is saved; you catch the error.</li>
<li><code>Database.update(list, false)</code>: valid records are saved; you inspect <code>SaveResult</code> for failures. No exception thrown for record errors.</li></ul>
<p>Use all-or-none when the records must stay consistent (an order and its lines); partial success for independent records (data cleanup, integrations that log rejects).</p>`],
["dml-103","Senior","concept",`Which records can't be inserted together in one DML and what are the cross-object DML rules?`,
`<ul><li>Setup and non-setup objects together → mixed DML error.</li>
<li>A <code>List&lt;SObject&gt;</code> can hold up to 10 types; records are processed in chunks by type, and you can't have more than 10 chunks.</li>
<li>You can't upsert a generic list on an External Id; types must be concrete.</li>
<li>Some objects only support specific operations (e.g. <code>Event</code> with recurrence, <code>OpportunityLineItem</code> needs a matching pricebook).</li>
<li>Records referencing each other by external id in the same list must be ordered parent first.</li></ul>`],
["dml-104","Senior","scenario",`Users get "UNABLE_TO_LOCK_ROW" when two processes update Contacts of the same Account at the same time. Why does updating a Contact lock the Account?`,
`<p>For lookups and master-detail, inserting/updating a child (or changing its parent) takes a lock on the parent to keep relationships and rollups consistent. For Account–Contact, operations on contacts with an AccountId can lock the Account record. Many concurrent child operations on one parent (account data skew) cause contention.</p>
<p>Mitigations: sort batches by AccountId so one batch handles one parent's children, reduce batch size, avoid updating the parent from each child transaction (aggregate later), use Bulk API serial mode, add retry with backoff, and fix skew (&gt;10k children per Account).</p>`],
["dml-105","Mid","code",`Write code that inserts an Account with Contacts and Opportunities, and if anything fails, nothing is saved and the error identifies the failing record.`,
`<pre><code>public static Id createCustomer(Account acc, List&lt;Contact&gt; cons, List&lt;Opportunity&gt; opps) {
  Savepoint sp = Database.setSavepoint();
  try {
    insert acc;
    for (Contact c : cons) c.AccountId = acc.Id;
    for (Opportunity o : opps) o.AccountId = acc.Id;
    insert cons;
    insert opps;
    return acc.Id;
  } catch (DmlException e) {
    Database.rollback(sp);
    acc.Id = null;
    String msg = e.getDmlType(0) + ' on row ' + e.getDmlIndex(0) + ': ' + e.getDmlMessage(0);
    throw new AuraHandledException(msg);
  }
}</code></pre>
<p>Three DML plus one savepoint and one rollback = 5 DML statements counted.</p>`],
["dml-106","Mid","concept",`What does undelete do and which records can be undeleted?`,
`<p>Restores records from the Recycle Bin (15 days, or until emptied/over capacity) with their Ids and relationships. Query them with <code>ALL ROWS</code> and <code>IsDeleted = true</code>. Children deleted by cascade (master-detail) are restored with the parent. Undelete fires <code>after undelete</code> triggers, which rollup logic must handle. Not all objects support undelete (e.g. some setup objects).</p>`],
["dml-107","Senior","concept",`What's the difference between hard delete and delete, and how do you hard delete from Apex?`,
`<p><code>delete</code> moves records to the Recycle Bin. <code>Database.emptyRecycleBin(records)</code> removes them permanently (max 10,000 per call). Bulk API supports <code>hardDelete</code> with the "Bulk API Hard Delete" permission. Use hard delete in archiving jobs to reclaim storage immediately and avoid Recycle Bin limits.</p>`],
["dml-108","Senior","concept",`How does DML interact with field history, last modified fields and system mode?`,
`<ul><li>Updating a record with the same values still fires triggers and updates <code>LastModifiedDate</code>/<code>SystemModstamp</code>, but doesn't create field history rows.</li>
<li>DML from Apex runs in system mode (no CRUD/FLS) unless <code>as user</code>.</li>
<li><code>LastModifiedById</code> is the running user (Automated Process for platform event triggers).</li>
<li>Audit fields (CreatedDate etc.) can be set on insert only with "Set Audit Fields upon Record Creation" enabled, typically for migrations.</li></ul>
<p class="tip">Avoid "no-op" updates: they fire automation, cause lock contention and waste DML rows.</p>`],
["dml-109","Mid","concept",`How do you set a lookup using an External Id without querying the parent?`,
`<pre><code>Contact c = new Contact(LastName = 'Rao');
c.Account = new Account(ERP_Id__c = 'ACC-1001');   // parent reference by external id
insert c;</code></pre>
<p>Works with insert, update and upsert. The parent must exist and the external id must be unique, otherwise the DML fails for that record. Useful in integrations to save a SOQL query per batch.</p>`],
["dml-110","Senior","scenario",`An integration upserts 50,000 Contacts per night and you see random DUPLICATE_VALUE and lock errors. How do you make it robust?`,
`<ul><li>Ensure the External Id is marked <b>Unique</b> (and case-insensitive if keys differ by case).</li>
<li>Deduplicate the input file by key before sending; duplicates in the same batch cause errors.</li>
<li>Sort by AccountId to reduce parent lock contention; smaller batch sizes for skewed accounts.</li>
<li>Use Bulk API 2.0 and process the failed-records result file with automatic retry for lock errors.</li>
<li>Bypass non-essential automation for the integration user.</li></ul>`]
]);
