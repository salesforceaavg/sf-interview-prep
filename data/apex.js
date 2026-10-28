SF.add("apex", [
["apex-101","Senior","concept",`How does Apex pass parameters: by value or by reference? What does that mean for sObjects and collections?`,
`<p>Apex passes everything <b>by value</b>, but for non-primitive types the value is a <b>reference</b> to the object. So:</p>
<ul><li>Reassigning the parameter inside the method (<code>acc = new Account()</code>) does not affect the caller.</li>
<li>Mutating the object the reference points to (<code>acc.Name = 'X'</code>, <code>list.add(x)</code>, <code>map.put(k,v)</code>) <b>is</b> visible to the caller.</li></ul>
<pre><code>static void touch(Account a, List&lt;Account&gt; l) {
  a.Name = 'Changed';      // caller sees this
  l.add(new Account());    // caller sees this
  a = new Account(Name='New'); // caller does NOT see this
  l = new List&lt;Account&gt;();     // caller does NOT see this
}</code></pre>
<p>This matters in trigger handlers: passing <code>Trigger.new</code> to a helper and setting fields in a before trigger works without returning anything.</p>`],
["apex-102","Senior","concept",`What happens to sObject field values when you put the same record into two lists and update both?`,
`<p>Both lists hold references to the <b>same</b> instance, so a field change through one list is visible through the other. Updating both lists sends the record twice: two DML statements and two trigger executions. If you add the same instance twice to <b>one</b> list you get <code>System.ListException: Duplicate id in list</code>.</p>
<p>If instead you have two <b>different</b> instances with the same Id (e.g. one from a query, one created with <code>new Account(Id=...)</code>), each carries only its own field values. Updating the second one won't include fields set on the first. Consolidate with a <code>Map&lt;Id, SObject&gt;</code> and merge field values into a single instance per Id before DML.</p>`],
["apex-103","Mid","concept",`What is the difference between == and equals() for Strings, and how are String comparisons case-handled in Apex?`,
`<ul><li><code>==</code> on Strings is <b>case-insensitive</b>: <code>'abc' == 'ABC'</code> is true.</li>
<li><code>equals()</code> is case-sensitive; <code>equalsIgnoreCase()</code> is explicit.</li>
<li>Set and Map keys of type String are <b>case-sensitive</b>: <code>new Set&lt;String&gt;{'A'}.contains('a')</code> is false.</li>
<li>Id comparisons handle 15- vs 18-character Ids correctly when both are typed as <code>Id</code>; as Strings they don't.</li></ul>
<p class="tip">Typical bug: building a Map of emails from SOQL and looking up a mixed-case email from user input. Normalise with <code>toLowerCase()</code> on both sides.</p>`],
["apex-104","Senior","concept",`How do you implement equals() and hashCode() for a custom class used as a Map key or in a Set?`,
`<p>Without them, two instances with the same field values are treated as different keys (identity comparison). Implement both consistently:</p>
<pre><code>public class PriceKey {
  public Id productId; public String currencyCode;
  public PriceKey(Id p, String c) { productId = p; currencyCode = c; }
  public Boolean equals(Object o) {
    if (!(o instanceof PriceKey)) return false;
    PriceKey k = (PriceKey) o;
    return productId == k.productId &amp;&amp; currencyCode == k.currencyCode;
  }
  public Integer hashCode() {
    return (31 * System.hashCode(productId)) ^ System.hashCode(currencyCode);
  }
}</code></pre>
<p>Rules: equal objects must return the same hashCode; never mutate a key after inserting it into a Map. A simpler alternative is a String composite key like <code>productId + '|' + currencyCode</code>.</p>`],
["apex-105","Mid","concept",`What are the differences between a wrapper class, an inner class and a top-level class in Apex?`,
`<ul><li><b>Top-level class</b>: its own file, can have sharing keywords, can be global/public.</li>
<li><b>Inner class</b>: declared inside another; only one level of nesting allowed; inherits the outer class's sharing mode if it doesn't declare one; can't have static methods that reference outer instance members.</li>
<li><b>Wrapper class</b>: a usage pattern, not a language feature. Typically an inner class combining an sObject with UI state (<code>Boolean selected</code>) or several objects into one DTO for LWC. Fields returned to LWC need <code>@AuraEnabled</code>.</li></ul>`],
["apex-106","Senior","concept",`What is the virtual/abstract/override model in Apex and how does it differ from Java?`,
`<ul><li>Classes and methods are <b>final by default</b>. You must mark a class <code>virtual</code> or <code>abstract</code> to extend it, and a method <code>virtual</code> or <code>abstract</code> to override it.</li>
<li>The overriding method must use <code>override</code>.</li>
<li>Single inheritance for classes, multiple interfaces allowed.</li>
<li><code>super.method()</code> calls the parent implementation; <code>this()</code>/<code>super()</code> for constructor chaining.</li>
<li><code>protected</code> means visible to subclasses and inner classes in the same namespace.</li></ul>`],
["apex-107","Senior","design",`Explain the Selector, Domain and Service split with a concrete Opportunity example and what goes where.`,
`<ul><li><b>OpportunitiesSelector</b>: <code>selectByIdWithLineItems(Set&lt;Id&gt;)</code>, <code>selectOpenByAccount(Set&lt;Id&gt;)</code>. Only queries; standard field list; enforces user mode.</li>
<li><b>Opportunities (domain)</b>: wraps a list of records. <code>onBeforeInsert()</code> applies defaults, <code>validateDiscounts()</code>, <code>applyStageProbabilities()</code>. Logic that is about the records themselves. Called from the trigger handler.</li>
<li><b>OpportunityService</b>: business operations used by many entry points: <code>closeWon(Set&lt;Id&gt;)</code>, <code>applyDiscount(Set&lt;Id&gt;, Decimal)</code>. Owns the transaction (Unit of Work + savepoint). Called by LWC controllers, invocable actions, REST resources, batches.</li></ul>
<p>Controllers stay thin: validate input, call the service, map exceptions to <code>AuraHandledException</code>. This lets a REST endpoint and an LWC button share identical behaviour.</p>`],
["apex-108","Senior","concept",`What is the Apex heap and how do you keep large processing under the 6 MB / 12 MB limit?`,
`<ul><li>Heap is all live objects in the transaction: query results, collections, strings, JSON.</li>
<li>Use SOQL for loops to process in chunks of 200 instead of loading 50k rows.</li>
<li>Select only fields you need, especially avoid long text / rich text areas.</li>
<li>Null out large collections when done (<code>bigList = null;</code>) so they can be garbage collected mid-transaction.</li>
<li>Avoid <code>JSON.serialize</code> of large structures; build output incrementally with <code>JSONGenerator</code>.</li>
<li>Handle Blobs (files) in async contexts where the limit is 12 MB, or not in Apex at all.</li>
<li>Monitor with <code>Limits.getHeapSize()</code>.</li></ul>`],
["apex-109","Mid","concept",`What are the differences between Integer, Long, Decimal and Double and where do bugs come from?`,
`<ul><li><b>Integer</b>: 32-bit; overflows silently (wraps) beyond ±2,147,483,647.</li>
<li><b>Long</b>: 64-bit; use for millisecond timestamps (<code>Datetime.getTime()</code>).</li>
<li><b>Decimal</b>: arbitrary precision, used for Currency/Number fields. Use for money.</li>
<li><b>Double</b>: floating point; rounding errors (0.1 + 0.2).</li></ul>
<p>Common bugs: <code>Integer ms = 4 * 60 * 60 * 1000 * 24;</code> overflows — use <code>4L * ...</code>. Integer division truncates: <code>5/2 = 2</code>. Decimal division needs a scale: <code>a.divide(b, 2, System.RoundingMode.HALF_UP)</code>.</p>`],
["apex-110","Senior","concept",`What is the Request class / Quiddity and how do you use it?`,
`<p><code>Request.getCurrent()</code> gives the current request Id (correlates all logs of one transaction) and <code>getQuiddity()</code> returns how the code was invoked: <code>SYNCHRONOUS</code>, <code>FUTURE</code>, <code>QUEUEABLE</code>, <code>BATCH_APEX</code>, <code>SCHEDULED</code>, <code>RUNTEST_SYNC</code>, <code>REST</code>, <code>AURA</code>, <code>INVOCABLE_ACTION</code>, <code>TRANSACTION_FINALIZER_QUEUEABLE</code>, etc.</p>
<p>Use cases: a shared service that must not enqueue more async work when already async; a logger that tags each entry with entry point; skipping UI-only logic during data loads via API.</p>`],
["apex-111","Senior","concept",`How do you write Apex that works with any object generically (dynamic Apex)?`,
`<pre><code>public static List&lt;SObject&gt; cloneWithChildren(Id recordId, String childRel) {
  SObjectType t = recordId.getSObjectType();
  DescribeSObjectResult d = t.getDescribe();
  List&lt;String&gt; fields = new List&lt;String&gt;();
  for (SObjectField f : d.fields.getMap().values()) {
    DescribeFieldResult fd = f.getDescribe();
    if (fd.isCreateable() &amp;&amp; !fd.isUnique()) fields.add(fd.getName());
  }
  String q = 'SELECT ' + String.join(fields, ',') + ' FROM ' + d.getName() + ' WHERE Id = :recordId';
  SObject src = Database.query(q);
  SObject copy = src.clone(false, true, false, false);
  insert copy;
  return new List&lt;SObject&gt;{ copy };
}</code></pre>
<p>Key APIs: <code>Schema.getGlobalDescribe()</code> (expensive, cache it), <code>SObjectType.newSObject()</code>, <code>record.get('Field')</code>/<code>put()</code>, <code>getSObject()</code> for parents, <code>getSObjects()</code> for children, <code>clone(preserveId, isDeepClone, preserveReadonlyTimestamps, preserveAutonumber)</code>.</p>`],
["apex-112","Mid","concept",`What are the rules for @AuraEnabled methods returning data to LWC?`,
`<ul><li>Method must be <code>static</code> and <code>public</code> or <code>global</code>.</li>
<li><code>cacheable=true</code> for wire usage; no DML allowed then.</li>
<li>Custom class properties need <code>@AuraEnabled</code> on each field/property to be serialised.</li>
<li>Maps must use String/primitive keys for clean JSON.</li>
<li>Throw <code>AuraHandledException</code> for user-facing errors; other exceptions show a generic message in production.</li>
<li>Parameters from LWC: names must match; complex types arrive as Maps or custom classes.</li>
<li><code>continuation=true</code> for long-running callouts (Continuation pattern).</li></ul>`],
["apex-113","Senior","concept",`What is a Continuation and when do you use it?`,
`<p>A Continuation lets a Visualforce or Aura/LWC Apex action make a long-running callout (up to 120 s, up to 3 parallel requests) <b>without holding a server thread</b>. The platform calls back a method when the response arrives, so these requests don't count against the org limit of concurrent long-running requests (10 requests running more than 5 seconds).</p>
<pre><code>@AuraEnabled(continuation=true cacheable=true)
public static Object startRequest() {
  Continuation c = new Continuation(40);
  c.continuationMethod = 'processResponse';
  HttpRequest req = new HttpRequest();
  req.setEndpoint('callout:Slow_API/report'); req.setMethod('GET');
  c.state = c.addHttpRequest(req);
  return c;
}
@AuraEnabled(cacheable=true)
public static Object processResponse(List&lt;String&gt; labels, Object state) {
  return Continuation.getResponse(labels[0]).getBody();
}</code></pre>`],
["apex-114","Senior","concept",`What is the "Concurrent long-running Apex request" limit and how do you avoid it?`,
`<p>An org can have only <b>10 synchronous transactions running longer than 5 seconds</b> at once; the 11th fails with <code>ConcurrentPerOrgLongTxn Limit exceeded</code>. Causes: slow callouts in synchronous code, heavy queries on large objects, long triggers during a data load.</p>
<p>Fixes: move callouts to async or Continuations, make queries selective, reduce trigger work, and run data loads in batches outside business hours.</p>`],
["apex-115","Mid","concept",`What is the difference between System.debug, Limits methods and the Apex Replay Debugger?`,
`<ul><li><b>System.debug</b>: writes to the debug log at a log level; needs a trace flag.</li>
<li><b>Limits</b>: <code>Limits.getQueries()</code>, <code>getDmlRows()</code>, <code>getCpuTime()</code>, <code>getHeapSize()</code> to measure consumption in code.</li>
<li><b>Apex Replay Debugger</b> (VS Code): steps through a captured debug log with breakpoints and variable inspection, without live debugging.</li>
<li><b>Apex Log Analyzer</b> (VS Code extension): flame chart of where CPU time and SOQL go.</li></ul>`],
["apex-116","Senior","concept",`What are user-mode database operations and how do they differ from system mode?`,
`<pre><code>List&lt;Account&gt; a = [SELECT Id, Name FROM Account WITH USER_MODE];
insert as user records;
update as system records;
Database.query(q, AccessLevel.USER_MODE);
Database.insert(records, false, AccessLevel.USER_MODE);</code></pre>
<ul><li>User mode enforces sharing, object permissions and FLS, including fields in WHERE/ORDER BY, and reports every inaccessible field in the exception (<code>getInaccessibleFields()</code>).</li>
<li>It applies only to that statement; the class's sharing keyword still applies elsewhere.</li>
<li>Permission set "elevation": <code>AccessLevel.USER_MODE.withPermissionSetId(psId)</code> runs with a user's access plus a specific permission set.</li></ul>`],
["apex-117","Senior","scenario",`An Apex class works for admins but throws "Insufficient privileges" or returns nothing for standard users. Walk through your diagnosis.`,
`<ol><li>Is the user allowed to run the class? Apex Class Access on profile/permission set (required for <code>@AuraEnabled</code>, Visualforce controllers, REST).</li>
<li>Sharing: is the class <code>with sharing</code> and the user lacks record access? Check with <code>UserRecordAccess</code>.</li>
<li>User mode queries or <code>stripInaccessible</code> silently dropping fields the profile can't read.</li>
<li>Custom permission checks or Custom Metadata-driven feature flags.</li>
<li>Record type or picklist values unavailable to the profile on insert.</li>
<li>Reproduce with a debug log on that user or <code>System.runAs</code> in a test.</li></ol>`],
["apex-118","Mid","concept",`What are enums in Apex and when are they better than strings?`,
`<pre><code>public enum CaseTier { BRONZE, SILVER, GOLD, PLATINUM }
CaseTier t = CaseTier.valueOf('GOLD');
switch on t { when GOLD, PLATINUM { slaHours = 4; } when else { slaHours = 24; } }
Integer rank = t.ordinal();</code></pre>
<p>They give compile-time checking, work in switch statements and are safer than magic strings. <code>Enum.valueOf()</code> throws for unknown values, so wrap input from the outside world.</p>`],
["apex-119","Senior","concept",`How does the switch statement work in Apex and where does it beat if/else?`,
`<pre><code>switch on record {
  when Account a { handleAccount(a); }
  when Contact c { handleContact(c); }
  when null      { return; }
  when else      { throw new UnsupportedOperationException(); }
}
switch on Trigger.operationType {
  when BEFORE_INSERT, BEFORE_UPDATE { applyDefaults(); }
  when AFTER_INSERT                 { createTasks(); }
}</code></pre>
<p>Supports Integer, Long, String (case-sensitive), Id, enums and sObject type matching with variable binding. Clearer and less error-prone than chained instanceof checks.</p>`],
["apex-120","Senior","design",`How do you design feature toggles in Apex so business can enable a feature per user group without deployment?`,
`<ul><li>Custom Metadata <code>Feature_Flag__mdt</code> with Active__c, Permission__c (custom permission API name), Percentage__c.</li>
<li>Service <code>Features.isEnabled('New_Pricing')</code>: reads metadata (no SOQL limit cost), checks <code>FeatureManagement.checkPermission</code> if a permission is set, caches in a static Map.</li>
<li>Rollout by assigning a permission set to a pilot group; disabling is a metadata change, not a code deploy.</li>
<li>In tests, inject flag values via a <code>@TestVisible</code> static override, because Custom Metadata records can't be inserted in tests.</li></ul>`]
]);
