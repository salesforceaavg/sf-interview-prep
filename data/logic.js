SF.add("logic", [
["logic-101","Mid","output",`What does this print?<pre><code>Decimal d = 5 / 2;
System.debug(d);</code></pre>`,
`<p><b>2</b>. Both operands are Integers, so integer division happens first (2), then the result is converted to Decimal. Write <code>5.0 / 2</code> or <code>Decimal.valueOf(5) / 2</code> to get 2.5.</p>`],
["logic-102","Mid","output",`What does this print?<pre><code>String a = 'Hello';
System.debug(a == 'hello');
System.debug(a.equals('hello'));
System.debug(new Set&lt;String&gt;{ 'Hello' }.contains('hello'));</code></pre>`,
`<p><b>true, false, false</b>. <code>==</code> on Strings is case-insensitive, <code>equals()</code> is case-sensitive, and Set/Map String keys are case-sensitive.</p>`],
["logic-103","Mid","output",`What happens here?<pre><code>Decimal price = 10.456;
price.setScale(2);
System.debug(price);</code></pre>`,
`<p>Prints <b>10.456</b>. <code>setScale()</code> returns a new Decimal; it doesn't modify <code>price</code>. Correct: <code>price = price.setScale(2, RoundingMode.HALF_UP);</code> → 10.46. Same trap with String methods: <code>s.trim();</code> without assignment does nothing.</p>`],
["logic-104","Mid","output",`What does this return?<pre><code>List&lt;String&gt; parts = 'a.b.c'.split('.');
System.debug(parts.size());</code></pre>`,
`<p><b>0</b>. <code>split()</code> takes a <b>regular expression</b>; <code>.</code> matches every character, producing only empty strings, which are removed. Use <code>split('\\\\.')</code> in Apex source (escaped dot) to get 3 parts. Same issue with <code>|</code>.</p>`],
["logic-105","Mid","output",`What happens?<pre><code>Account a = [SELECT Id FROM Account LIMIT 1];
System.debug(a.Name);</code></pre>`,
`<p>Throws <code>System.SObjectException: SObject row was retrieved via SOQL without querying the requested field: Account.Name</code>. Accessing a field not in the SELECT fails (except Id). If the query returns no rows, it fails earlier with <code>QueryException: List has no rows for assignment to SObject</code>.</p>`],
["logic-106","Mid","output",`Spot the bug:<pre><code>Account acc = [SELECT Id FROM Account WHERE Name = :name LIMIT 1];
if (acc == null) { acc = new Account(Name = name); insert acc; }</code></pre>`,
`<p>When no Account matches, the single-row assignment throws <code>QueryException: List has no rows for assignment to SObject</code>; the null check never runs. Query into a List and check <code>isEmpty()</code>:</p>
<pre><code>List&lt;Account&gt; l = [SELECT Id FROM Account WHERE Name = :name LIMIT 1];
Account acc = l.isEmpty() ? new Account(Name = name) : l[0];</code></pre>`],
["logic-107","Mid","output",`What does this print?<pre><code>String s;
System.debug(s + 'x');
System.debug(String.isBlank('  '));
System.debug(String.isEmpty('  '));</code></pre>`,
`<p><b>nullx, true, false</b>. Concatenating a null String produces the text "null". <code>isBlank</code> treats whitespace as blank; <code>isEmpty</code> only checks null or length 0.</p>`],
["logic-108","Senior","output",`What does this print?<pre><code>public virtual class A { public virtual String who() { return 'A'; } }
public class B extends A { public override String who() { return 'B' + super.who(); } }
A x = new B();
System.debug(x.who());</code></pre>`,
`<p><b>BA</b>. Dynamic dispatch calls B's override even though the variable type is A; <code>super.who()</code> appends A's result.</p>`],
["logic-109","Mid","output",`What happens?<pre><code>Boolean flag;
if (flag) { System.debug('yes'); }</code></pre>`,
`<p>Throws <code>System.NullPointerException</code>. An uninitialised Boolean is <code>null</code>, not false. Initialise (<code>Boolean flag = false;</code>) or write <code>if (flag == true)</code>.</p>`],
["logic-110","Mid","output",`What happens?<pre><code>List&lt;Integer&gt; nums = new List&lt;Integer&gt;{1, 2, 3};
for (Integer n : nums) { if (n == 2) nums.add(4); }</code></pre>`,
`<p>Throws <code>System.FinalException: Cannot modify a collection while it is being iterated</code>. Iterate over a copy (<code>new List&lt;Integer&gt;(nums)</code>) or collect additions in a second list and <code>addAll</code> after the loop. Removing elements needs an index-based loop going backwards.</p>`],
["logic-111","Mid","output",`What is the value of <code>d</code>?<pre><code>Date d = Date.newInstance(2024, 1, 31).addMonths(1);</code></pre>`,
`<p><b>2024-02-29</b>. <code>addMonths</code> keeps the day if possible, otherwise uses the last day of the target month (2024 is a leap year). From 2023-01-31 the result would be 2023-02-28.</p>`],
["logic-112","Senior","output",`Two developers write this in a test. What does it print?<pre><code>Account a1 = new Account(Name = 'X', Industry = 'IT');
Account a2 = new Account(Name = 'X', Industry = 'IT');
System.debug(a1 == a2);
System.debug(a1 === a2);</code></pre>`,
`<p><b>true, false</b>. For sObjects, <code>==</code> compares field values deeply; <code>===</code> checks if both references point to the same instance. Relevant when using sObjects as Set elements or Map keys: two instances with identical values collide, and changing fields after adding them breaks lookups.</p>`],
["logic-113","Mid","output",`What does this print?<pre><code>Integer i = 2147483647;
i++;
System.debug(i);</code></pre>`,
`<p><b>-2147483648</b>. Integer overflow wraps silently. Use Long for large values (e.g. milliseconds: <code>Long ms = 24L * 60 * 60 * 1000 * 30;</code>).</p>`],
["logic-114","Mid","output",`What does this print?<pre><code>Account a;
System.debug(a?.Name);
Integer n;
System.debug(n ?? 5);</code></pre>`,
`<p><b>null, 5</b>. The safe navigation operator <code>?.</code> returns null instead of throwing; the null coalescing operator <code>??</code> returns the right operand when the left is null. Without <code>?.</code>, <code>a.Name</code> throws NullPointerException.</p>`],
["logic-115","Senior","output",`Find all the problems:<pre><code>trigger ContactTrigger on Contact (after insert) {
  for (Contact c : Trigger.new) {
    Account a = [SELECT Id, Contact_Count__c FROM Account WHERE Id = :c.AccountId];
    a.Contact_Count__c = a.Contact_Count__c + 1;
    update a;
  }
}</code></pre>`,
`<ul><li>SOQL and DML inside the loop: 101 contacts → SOQL limit; 151 → DML limit.</li>
<li>Contacts without AccountId → <code>QueryException</code> (no rows).</li>
<li><code>Contact_Count__c</code> null on first use → NullPointerException.</li>
<li>Two contacts for the same Account in one batch → updates the same Account twice, and incrementing is wrong under concurrency; doesn't handle delete/undelete/reparent.</li>
<li>Logic in the trigger body instead of a handler.</li></ul>
<p>Fix: collect AccountIds, recount with an aggregate query, update once (see the Contact count question in Triggers).</p>`],
["logic-116","Mid","output",`What happens?<pre><code>trigger AccTrig on Account (after update) {
  for (Account a : Trigger.new) a.Description = 'Updated';
}</code></pre>`,
`<p>Throws <code>System.FinalException: Record is read-only</code>. Records in <code>Trigger.new</code> can only be modified in before triggers. In after triggers, create new instances (<code>new Account(Id = a.Id, Description = 'Updated')</code>) and update them — and guard against recursion.</p>`],
["logic-117","Senior","output",`Will the catch block run?<pre><code>try {
  for (Integer i = 0; i &lt; 150; i++) { Integer c = [SELECT COUNT() FROM Account]; }
} catch (Exception e) {
  System.debug('caught');
}</code></pre>`,
`<p><b>No.</b> The 101st query throws <code>System.LimitException</code>, which can't be caught; the transaction ends immediately. Check consumption with <code>Limits.getQueries()</code> beforehand if you need defensive code. (Async Queueable finalizers can observe it after the fact.)</p>`],
["logic-118","Mid","output",`What's wrong?<pre><code>for (Account a : accounts) {
  a = new Account(Id = a.Id, Rating = 'Hot');
}
update accounts;</code></pre>`,
`<p>Reassigning the loop variable replaces only the local reference; the list still holds the original instances, so <code>Rating</code> isn't changed. Set the field directly (<code>a.Rating = 'Hot';</code>) or build a new list.</p>`],
["logic-119","Mid","output",`What happens?<pre><code>Map&lt;String, Integer&gt; stock = new Map&lt;String, Integer&gt;{ 'A' =&gt; 5 };
Integer left = stock.get('B') - 1;</code></pre>`,
`<p><code>stock.get('B')</code> returns null; arithmetic on null throws <code>NullPointerException</code>. Use <code>containsKey</code> or <code>(stock.get('B') ?? 0) - 1</code>.</p>`],
["logic-120","Senior","output",`A batch is started with <code>Database.executeBatch(new MyBatch(), 5000);</code> using a QueryLocator. What scope does execute() actually receive?`,
`<p>At most <b>2,000</b> records per execute. For QueryLocator the maximum scope is 2,000; larger values are chunked into batches of up to 2,000. With an Iterable, larger scopes are allowed but limits make them impractical.</p>`],
["logic-121","Senior","output",`What does this print and why?<pre><code>public class Counter { public static Integer n = 0; }
// before insert trigger on Lead:
Counter.n++;
System.debug('Run ' + Counter.n + ' size ' + Trigger.size);
// Apex: insert 450 leads in one DML statement</code></pre>`,
`<p>Three trigger invocations in the <b>same transaction</b>: "Run 1 size 200", "Run 2 size 200", "Run 3 size 50". Static variables persist across the chunks, which is why a static "already ran" Boolean skips chunks 2 and 3.</p>`],
["logic-122","Mid","output",`What's the problem with this LWC code?<pre><code>connectedCallback() {
  setTimeout(function () { this.loading = false; }, 500);
}</code></pre>`,
`<p>Inside a regular <code>function</code>, <code>this</code> isn't the component, so <code>this.loading</code> is set on the wrong object (or throws in strict mode). Use an arrow function: <code>setTimeout(() =&gt; { this.loading = false; }, 500);</code>. Also clear timers in <code>disconnectedCallback</code>.</p>`],
["logic-123","Mid","output",`What does the template show?<pre><code>// js
async connectedCallback() { this.accounts = getAccounts(); }
// html
&lt;template for:each={accounts} for:item="a"&gt;...</code></pre>`,
`<p>Nothing useful: <code>getAccounts()</code> returns a <b>Promise</b> because there's no <code>await</code>, so <code>this.accounts</code> is a Promise and the iteration fails. Fix: <code>this.accounts = await getAccounts();</code> inside try/catch.</p>`],
["logic-124","Mid","output",`What's wrong with this Apex for an LWC wire?<pre><code>@AuraEnabled(cacheable=true)
public static void markRead(Id recordId) { update new Task(Id = recordId, Status = 'Completed'); }</code></pre>`,
`<p>Cacheable methods can't perform DML: it throws "Too many DML statements: 1" at runtime (DML is blocked in cacheable context). Remove <code>cacheable=true</code> and call it imperatively. Cacheable methods should also return data, not void.</p>`],
["logic-125","Senior","output",`What happens when this runs from a trigger?<pre><code>@future
public static void sync(List&lt;Account&gt; accs) { ... }</code></pre>`,
`<p>It doesn't compile: future method parameters must be primitives, collections of primitives, or arrays of primitives — not sObjects. Pass <code>Set&lt;Id&gt;</code> and re-query, or switch to Queueable which accepts sObjects.</p>`],
["logic-126","Senior","output",`What's the bug in this recursion guard?<pre><code>public class Guard { public static Boolean ran = false; }
// after update handler
if (Guard.ran) return;
Guard.ran = true;
updateRelatedContacts(Trigger.new);</code></pre>`,
`<p>With more than 200 records (or partial-success retries), the second chunk returns early and its contacts are never updated. Workflow/flow re-saves that changed relevant fields are also skipped. Use change detection and a Set of processed Ids instead.</p>`],
["logic-127","Mid","output",`What does this SOQL return if the Account has no Contacts?<pre><code>SELECT Id, (SELECT Id FROM Contacts) FROM Account WHERE Id = :accId</code></pre>`,
`<p>One Account row; <code>acc.Contacts</code> is an <b>empty list</b>, not null. A filter in the subquery doesn't exclude the parent — use a semi-join (<code>Id IN (SELECT AccountId FROM Contact)</code>) to restrict parents.</p>`],
["logic-128","Senior","output",`How many DML statements does this consume?<pre><code>Savepoint sp = Database.setSavepoint();
insert acc;
insert contacts;      // 300 contacts
Database.rollback(sp);</code></pre>`,
`<p><b>4 DML statements</b> (setSavepoint and rollback each count as one) and 301 DML rows for the inserts. The rolled-back inserts still count toward limits.</p>`],
["logic-129","Mid","output",`What's wrong?<pre><code>for (Case c : cases) {
  Messaging.SingleEmailMessage m = new Messaging.SingleEmailMessage();
  m.setTargetObjectId(c.ContactId); m.setTemplateId(tplId);
  Messaging.sendEmail(new List&lt;Messaging.SingleEmailMessage&gt;{ m });
}</code></pre>`,
`<p><code>sendEmail</code> is limited to 10 calls per transaction; the 11th case throws a LimitException. Build the list in the loop and call <code>sendEmail</code> once with the whole list. Also set <code>setWhatId(c.Id)</code> for merge fields and <code>setSaveAsActivity</code> as needed.</p>`],
["logic-130","Senior","output",`What prints?<pre><code>List&lt;Account&gt; l1 = new List&lt;Account&gt;{ new Account(Name = 'A') };
List&lt;Account&gt; l2 = l1;
l2.add(new Account(Name = 'B'));
List&lt;Account&gt; l3 = l1.clone();
l3[0].Name = 'Z';
System.debug(l1.size() + ' ' + l1[0].Name);</code></pre>`,
`<p><b>2 Z</b>. <code>l2</code> is the same list as <code>l1</code>. <code>clone()</code> on a list of sObjects is a <b>shallow</b> copy: a new list holding the same record instances, so changing <code>l3[0].Name</code> changes l1's first record. Use <code>deepClone()</code> for independent records.</p>`],
["logic-131","Mid","output",`What does this print?<pre><code>Datetime dt = Datetime.newInstanceGmt(2025, 3, 31, 20, 0, 0);
System.debug(dt.date());   // running user in Asia/Kolkata (GMT+5:30)
System.debug(dt.dateGmt());</code></pre>`,
`<p><b>2025-04-01</b> and <b>2025-03-31</b>. <code>date()</code> converts to the user's time zone (20:00 GMT is 01:30 next day in IST); <code>dateGmt()</code> doesn't. A classic source of off-by-one-day bugs in SLA and reporting logic.</p>`],
["logic-132","Senior","output",`A Queueable's execute() enqueues itself again unconditionally. What happens in production and in a test?`,
`<p>Production: an infinite chain consuming the daily async limit (and possibly delayed/blocked by the platform's stack depth protections). In a test: chaining from a Queueable isn't allowed, so it throws when it tries to enqueue during <code>stopTest</code>. Always have a termination condition (no more records) and consider <code>AsyncOptions.MaximumQueueableStackDepth</code>.</p>`],
["logic-133","Mid","output",`What's the bug?<pre><code>Set&lt;Id&gt; accIds = new Set&lt;Id&gt;();
for (Contact c : Trigger.new) accIds.add(c.AccountId);
List&lt;Account&gt; accs = [SELECT Id FROM Account WHERE Id IN :accIds];</code></pre>`,
`<p>Not a crash, but <code>accIds</code> may contain <code>null</code> (contacts without an account). In SOQL, <code>IN :set</code> with null is ignored, but downstream code like <code>map.get(c.AccountId)</code> returning null leads to NPEs. Filter nulls when collecting. Also: in a delete trigger <code>Trigger.new</code> is null.</p>`],
["logic-134","Senior","output",`What does this code do wrong in terms of security?<pre><code>@AuraEnabled
public static List&lt;Account&gt; search(String term) {
  return Database.query('SELECT Id, Name FROM Account WHERE Name LIKE \\'%' + term + '%\\'');
}</code></pre>`,
`<p>SOQL injection: a term like <code>%' OR Name != '</code> changes the query. Also no FLS/CRUD enforcement and sharing depends on the class keyword (missing here). Fix: bind variable and user mode:</p>
<pre><code>String t = '%' + term + '%';
return [SELECT Id, Name FROM Account WHERE Name LIKE :t WITH USER_MODE LIMIT 50];</code></pre>`],
["logic-135","Mid","output",`What does this print?<pre><code>List&lt;Integer&gt; l = new List&lt;Integer&gt;{3, 1, 2};
l.sort();
Set&lt;Integer&gt; s = new Set&lt;Integer&gt;(l);
s.add(1);
System.debug(l + ' ' + s.size());</code></pre>`,
`<p><b>(1, 2, 3) 3</b>. <code>sort()</code> sorts in place; Sets ignore duplicates. For custom sorting of objects implement <code>Comparable</code> or pass a <code>Comparator</code> to <code>List.sort(comparator)</code>.</p>`]
]);
