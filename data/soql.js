SF.add("soql", [
["soql-101","Senior","output",`A query returns an Account with 1,200 child Contacts in a subquery. The code does <code>List&lt;Contact&gt; cs = acc.Contacts;</code>. What happens?`,
`<p>It throws <code>System.QueryException: Aggregate query has too many rows for direct assignment, use FOR loop</code>. When a subquery returns more than about 200 child rows, the child list is fetched lazily with queryMore and can't be assigned directly.</p>
<pre><code>for (Account a : [SELECT Id, (SELECT Id FROM Contacts) FROM Account WHERE Id IN :ids]) {
  for (Contact c : a.Contacts) { /* iterate, don't assign */ }
}</code></pre>`],
["soql-102","Senior","concept",`How do you read the Query Plan tool output?`,
`<p>Developer Console → Query Editor → Query Plan (enable in Preferences). Each row is a candidate plan:</p>
<ul><li><b>Leading operation type</b>: Index, TableScan, Sharing, Other.</li>
<li><b>Cardinality</b>: estimated rows returned by that plan.</li>
<li><b>sObject cardinality</b>: total rows in the object.</li>
<li><b>Cost</b>: relative to the selectivity threshold. Below 1 means selective; the optimizer picks the lowest cost.</li>
<li><b>Notes</b>: why an index can't be used (e.g. "not considering filter for optimization because unindexed").</li></ul>
<p>If the best plan is a TableScan with cost &gt; 1 on a large object, the query will be slow, and in triggers it fails as non-selective.</p>`],
["soql-103","Senior","concept",`Why might a filter on an indexed field still be non-selective?`,
`<ul><li>The filter matches too many rows (above the 10%/30% thresholds), e.g. <code>Status__c = 'Active'</code> where 90% are active.</li>
<li>Negative operators: <code>!=</code>, <code>NOT IN</code>, <code>EXCLUDES</code>.</li>
<li>Leading wildcard <code>LIKE '%x'</code>.</li>
<li><code>= null</code> on a custom index (nulls aren't indexed by default unless Support enables it).</li>
<li>Formula fields referencing other objects, or non-deterministic formulas.</li>
<li>OR conditions where any branch is unindexed (every branch must be selective).</li>
<li>Comparing to a field (not literal) or using functions on the indexed field.</li></ul>`],
["soql-104","Mid","concept",`How do you query records based on fields of a grandparent and filter children in the same query?`,
`<pre><code>SELECT Id, Name, Account.Parent.Name,
  (SELECT Id, Subject FROM Cases WHERE Priority = 'High' AND IsClosed = false ORDER BY CreatedDate DESC)
FROM Contact
WHERE Account.Parent.Industry = 'Banking'
AND Account.Owner.IsActive = true</code></pre>
<p>Child-to-parent: up to 5 levels via dot notation. Filters on the outer query apply to parents; filters inside the subquery only limit which children are returned, they do <b>not</b> exclude parents without children. For "only contacts that have high-priority cases" add a semi-join: <code>AND Id IN (SELECT ContactId FROM Case WHERE Priority='High')</code>.</p>`],
["soql-105","Mid","output",`What does this return: <code>SELECT COUNT() FROM Account</code> vs <code>SELECT COUNT(Id) FROM Account</code>?`,
`<ul><li><code>COUNT()</code>: returns an <b>Integer</b> directly: <code>Integer n = [SELECT COUNT() FROM Account];</code> Can't be mixed with other fields or GROUP BY.</li>
<li><code>COUNT(Id)</code>: returns <code>List&lt;AggregateResult&gt;</code>, read via <code>(Integer) ar.get('expr0')</code> or an alias. Can combine with GROUP BY and other aggregates.</li></ul>
<p>Both count toward the query row limit: <code>COUNT()</code> counts every matching row toward the 50,000 limit in Apex (each counted record counts as one row). For very large counts use <code>Database.countQuery</code> in async or a report.</p>`],
["soql-106","Senior","code",`Write a query to find Accounts where the sum of open Opportunity Amount is greater than the Account's credit limit field.`,
`<p>SOQL can't compare an aggregate to a parent field in HAVING, so do it in two steps:</p>
<pre><code>Map&lt;Id, Decimal&gt; openByAcc = new Map&lt;Id, Decimal&gt;();
for (AggregateResult ar : [SELECT AccountId a, SUM(Amount) s FROM Opportunity
     WHERE IsClosed = false AND AccountId != null GROUP BY AccountId]) {
  openByAcc.put((Id) ar.get('a'), (Decimal) ar.get('s'));
}
List&lt;Account&gt; over = new List&lt;Account&gt;();
for (Account a : [SELECT Id, Name, Credit_Limit__c FROM Account WHERE Id IN :openByAcc.keySet()]) {
  if (a.Credit_Limit__c != null &amp;&amp; openByAcc.get(a.Id) &gt; a.Credit_Limit__c) over.add(a);
}</code></pre>
<p>If this runs often, maintain an <code>Open_Pipeline__c</code> rollup on Account plus a formula checkbox <code>Over_Limit__c = Open_Pipeline__c &gt; Credit_Limit__c</code>, then filter <code>WHERE Over_Limit__c = true</code>. You can't compare two fields directly in SOQL.</p>`],
["soql-107","Mid","concept",`Can you compare two fields in a SOQL WHERE clause?`,
`<p>No. <code>WHERE Amount &gt; Budget__c</code> is invalid. Options: a formula field (checkbox or number difference) and filter on it, compute in Apex after the query, or use reports with row-level formulas. Note formula fields usually can't be indexed, so filter on something selective as well.</p>`],
["soql-108","Senior","concept",`How do you query and use Big Objects?`,
`<ul><li>Big objects (<code>__b</code>) store billions of rows for history/archive.</li>
<li>Query only with filters on the <b>index fields, in order</b>, no gaps; the last filtered field can use a range. Only standard SOQL subset (no aggregates on custom big objects, no OR, no LIKE).</li>
<li>Insert with <code>Database.insertImmediate()</code>; re-inserting the same index values overwrites (idempotent upsert behaviour).</li>
<li>No triggers, no flows, no sharing, no standard UI; build LWC to display.</li>
<li>Async SOQL is retired; aggregate big object data with Batch Apex or move to Data Cloud.</li></ul>`],
["soql-109","Mid","concept",`How do you search multi-select picklists and how do INCLUDES/EXCLUDES behave?`,
`<pre><code>SELECT Id FROM Account WHERE Regions__c INCLUDES ('APAC;EMEA', 'LATAM')</code></pre>
<p>Values separated by <code>;</code> inside one string mean AND (must contain both APAC and EMEA); separate strings in the list mean OR. So the above returns records with (APAC and EMEA) or LATAM. <code>EXCLUDES</code> is the negation. You can't use <code>=</code> for partial matches on multi-select. These filters aren't selective on large objects.</p>`],
["soql-110","Senior","scenario",`A LWC search on Contact by name and phone is slow with 3 million Contacts. How do you redesign it?`,
`<ul><li>Replace <code>LIKE '%term%'</code> SOQL with SOSL <code>FIND :term IN ALL FIELDS RETURNING Contact(Id, Name, Phone LIMIT 50)</code>; it uses the search index.</li>
<li>Require at least 3 characters and debounce input (300 ms).</li>
<li>Phone searches: store a normalised digits-only phone in an indexed text field (External Id) and query with exact or prefix match <code>LIKE '98765%'</code> (prefix LIKE can use an index).</li>
<li>Return minimal fields, paginate, cache with <code>cacheable=true</code>.</li>
<li>Restrict scope with an indexed filter (RecordTypeId, OwnerId, or a region field).</li></ul>`],
["soql-111","Mid","concept",`What is the difference between WHERE and HAVING?`,
`<p>WHERE filters rows before grouping and can't use aggregate functions. HAVING filters groups after aggregation and can use aggregates and grouped fields. Example: <code>SELECT LeadSource, COUNT(Id) FROM Lead WHERE CreatedDate = THIS_YEAR GROUP BY LeadSource HAVING COUNT(Id) &gt; 100</code>.</p>`],
["soql-112","Senior","concept",`How do record visibility and sharing affect SOQL results and performance?`,
`<ul><li>In <code>with sharing</code> or user mode, the query joins the sharing tables, which can make a selective-looking query slow for users with access to few records in huge objects.</li>
<li>Admins with "View All Data" skip sharing checks, so performance tests as admin are misleading.</li>
<li>Aggregate counts differ per user.</li>
<li>For report-like features, consider running a narrowly scoped <code>without sharing</code> query that returns only aggregated, non-sensitive data — documented and reviewed.</li></ul>`],
["soql-113","Mid","code",`Write SOSL that searches the term in Accounts and Contacts but only returns active Contacts and sorts Accounts by name.`,
`<pre><code>String term = String.escapeSingleQuotes(input) + '*';
List&lt;List&lt;SObject&gt;&gt; res = [
  FIND :term IN NAME FIELDS
  RETURNING
    Account(Id, Name, Industry ORDER BY Name LIMIT 20),
    Contact(Id, Name, Email WHERE Active__c = true ORDER BY LastName LIMIT 20)
  WITH USER_MODE];
List&lt;Account&gt; accounts = (List&lt;Account&gt;) res[0];
List&lt;Contact&gt; contacts = (List&lt;Contact&gt;) res[1];</code></pre>
<p>The order of lists in the result matches the RETURNING order.</p>`],
["soql-114","Senior","concept",`What is SOQL query row locking vs record locking during DML, and what does "FOR VIEW / FOR REFERENCE" do?`,
`<ul><li><code>FOR UPDATE</code>: locks selected rows until commit; others wait up to 10 seconds then fail.</li>
<li><code>FOR VIEW</code>: updates LastViewedDate for the records (populates recently viewed lists).</li>
<li><code>FOR REFERENCE</code>: updates LastReferencedDate.</li>
<li>DML itself locks the updated row and, for some relationships, the parent (e.g. inserting a child in master-detail or lookup with certain settings locks the parent briefly).</li></ul>`],
["soql-115","Mid","concept",`How do you query deleted and archived records, and what's special about Task/Event archiving?`,
`<p><code>SELECT Id FROM Task WHERE IsDeleted = true ALL ROWS</code> includes Recycle Bin rows (in Apex). Activities older than 365 days (closed tasks) and past events are archived; they're excluded from normal queries and visible only with <code>ALL ROWS</code> or <code>IsArchived = true</code> filters. Reports and related lists show them differently. Use <code>queryAll()</code> via API.</p>`]
]);
