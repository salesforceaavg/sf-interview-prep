SF.add("testing", [
["testing-101","Mid","code",`Write a test data factory and explain why it matters.`,
`<pre><code>@isTest
public class TestFactory {
  public static List&lt;Account&gt; accounts(Integer n, Boolean doInsert) {
    List&lt;Account&gt; l = new List&lt;Account&gt;();
    for (Integer i = 0; i &lt; n; i++) l.add(new Account(Name = 'Test Acc ' + i, Industry = 'Banking'));
    if (doInsert) insert l;
    return l;
  }
  public static User user(String profileName) {
    Profile p = [SELECT Id FROM Profile WHERE Name = :profileName];
    String u = 'u' + Crypto.getRandomInteger() + '@test.example';
    return new User(Alias = 'tuser', Email = u, Username = u, LastName = 'Test', ProfileId = p.Id,
      TimeZoneSidKey = 'Asia/Kolkata', LocaleSidKey = 'en_IN', EmailEncodingKey = 'UTF-8', LanguageLocaleKey = 'en_US');
  }
}</code></pre>
<p>When a new required field or validation rule is added, you change the factory once instead of 200 tests. It also produces consistent bulk data.</p>`],
["testing-102","Senior","concept",`What makes a good Apex test, beyond coverage?`,
`<ul><li>Arrange–Act–Assert with specific assertions on outcomes (field values, records created, exceptions thrown).</li>
<li>Bulk: 200+ records through triggers.</li>
<li>Negative paths: validation failures, permissions denied, callout errors.</li>
<li>Run as realistic users (<code>System.runAs</code> with a permission-set-based user) to catch sharing/FLS issues.</li>
<li>Isolated: no <code>SeeAllData=true</code>, no reliance on org config like specific record Ids.</li>
<li>Fast and deterministic: mock callouts and use dependency injection to avoid unnecessary DML.</li></ul>`],
["testing-103","Senior","output",`A test inserts an Account inside <code>System.runAs(standardUser)</code> and asserts the user can't see another user's Account via a with-sharing class. The test fails because the record is visible. Why?`,
`<p>Common reasons: the test data owner is the same user or above in the role hierarchy (test users without roles may still get access via "View All"/OWD Public Read), the org's Account OWD is Public Read Only in the org metadata used by tests (tests use real org sharing settings), or the query ran outside the <code>runAs</code> block. <code>runAs</code> enforces record sharing but <b>not</b> user permissions/FLS for code without user mode. Set up the owner explicitly, check OWD, and assert inside runAs.</p>`],
["testing-104","Mid","concept",`How do Test.startTest and Test.stopTest affect limits and async code?`,
`<ul><li>Code between them gets a fresh set of governor limits (separating setup cost from the code under test).</li>
<li>Async work (future, queueable, batch, scheduled) enqueued between them runs synchronously at <code>stopTest()</code>.</li>
<li>Only one pair per test method.</li>
<li>For a scheduled job, stopTest runs the Schedulable execute; any batch it starts runs too only if enqueued before stopTest completes (assert carefully).</li></ul>`],
["testing-105","Senior","code",`Test a Queueable that chains another Queueable and makes a callout.`,
`<pre><code>@isTest
static void processesAndChains() {
  Test.setMock(HttpCalloutMock.class, new RoutingMock().add('/orders', 200, '{"ok":true}'));
  Order__c o = new Order__c(Status__c = 'Pending'); insert o;
  Test.startTest();
  System.enqueueJob(new SendOrderJob(new List&lt;Id&gt;{ o.Id }));
  Test.stopTest();   // runs SendOrderJob; chained job is not executed in tests
  Assert.areEqual('Sent', [SELECT Status__c FROM Order__c WHERE Id = :o.Id].Status__c);
}</code></pre>
<p>In tests, a Queueable can't chain another one (it throws), so production code guards: <code>if (!Test.isRunningTest()) System.enqueueJob(next);</code> or better, inject a "chain enabled" flag. Test the second job separately.</p>`],
["testing-106","Mid","concept",`How do you test code that depends on Custom Metadata records?`,
`<p>Custom Metadata records deployed to the org are visible in tests (no SeeAllData needed), but you can't insert them with DML. To test multiple configurations, wrap access in a class with a <code>@TestVisible</code> static override list, or construct records in memory (<code>new Feature_Flag__mdt(DeveloperName='X', Active__c=true)</code>) and inject them.</p>`],
["testing-107","Senior","concept",`What is the Apex Stub API and what are its limitations?`,
`<p><code>Test.createStub(Type, StubProvider)</code> creates a mock of an interface or non-final class; every method call is routed to <code>handleMethodCall</code>. Limitations: can't stub static methods, private methods, constructors, sObject getters, or system classes; the class must be visible and mockable (virtual or interface). Combine with dependency injection. Libraries like ApexMocks/Amoss provide fluent stubbing.</p>`],
["testing-108","Mid","concept",`How do you test that code throws the correct exception?`,
`<pre><code>try {
  OrderService.submit(null);
  Assert.fail('Expected OrderException');
} catch (OrderService.OrderException e) {
  Assert.isTrue(e.getMessage().contains('Order is required'));
}</code></pre>
<p>Without <code>Assert.fail</code>, the test passes even when no exception is thrown.</p>`],
["testing-109","Senior","scenario",`A test passes in sandbox but fails during production deployment. List the likely reasons.`,
`<ul><li>Validation rules, required fields or flows in production differ from sandbox.</li>
<li>Test relies on existing data (SeeAllData, hard-coded Ids, specific Pricebook other than the standard one via <code>Test.getStandardPricebookId()</code>).</li>
<li>Profiles, roles or permission set names differ.</li>
<li>Duplicate rules blocking test data, unique usernames colliding.</li>
<li>Date/time assumptions (time zones, end of month).</li>
<li>Managed package versions differ.</li></ul>`],
["testing-110","Mid","concept",`How do you test Opportunity Line Items and Pricebooks?`,
`<pre><code>Id stdPb = Test.getStandardPricebookId();
Product2 p = new Product2(Name = 'Widget', IsActive = true); insert p;
PricebookEntry pbe = new PricebookEntry(Pricebook2Id = stdPb, Product2Id = p.Id, UnitPrice = 100, IsActive = true);
insert pbe;
Opportunity o = new Opportunity(Name='T', StageName='Prospecting', CloseDate=Date.today(), Pricebook2Id = stdPb);
insert o;
insert new OpportunityLineItem(OpportunityId = o.Id, PricebookEntryId = pbe.Id, Quantity = 2, UnitPrice = 100);</code></pre>
<p>The standard pricebook can't be created in tests; <code>getStandardPricebookId()</code> provides it without SeeAllData.</p>`],
["testing-111","Senior","concept",`How do you test Platform Event triggers and CDC triggers?`,
`<ul><li>Publish events inside startTest/stopTest; <code>Test.stopTest()</code> delivers them. Or call <code>Test.getEventBus().deliver()</code> to deliver at any point.</li>
<li>For CDC: <code>Test.enableChangeDataCapture()</code> then perform DML; deliver with <code>Test.getEventBus().deliver()</code>.</li>
<li>Test retry logic by throwing <code>EventBus.RetryableException</code> and delivering again.</li></ul>`],
["testing-112","Mid","concept",`How do you test an LWC Apex controller method that uses USER_MODE?`,
`<p>Create a user with a minimal permission set, insert data as an admin, then call the method in <code>System.runAs(user)</code>. Assert that inaccessible fields cause an exception (<code>QueryException</code> with inaccessible fields) or are stripped. Also test with a permission set assigned to verify the positive path.</p>`],
["testing-113","Senior","design",`How do you speed up a test suite that takes 2 hours to run?`,
`<ul><li>Find slow tests in the Test Execution history; most time is DML firing heavy automation.</li>
<li>Use <code>@TestSetup</code> once per class instead of per method.</li>
<li>Unit tests with mocks/stubs for logic; fewer integration tests with DML.</li>
<li>Bypass unrelated automation via a test-only switch.</li>
<li>Enable parallel testing and remove tests that lock shared records (which forces serial runs).</li>
<li>Delete tests that only chase coverage.</li></ul>`],
["testing-114","Mid","output",`What does this test assert and what is wrong with it?<pre><code>@isTest static void t() {
  insert new Account(Name='A');
  AccountService.process();
  System.assert(true);
}</code></pre>`,
`<p>It asserts nothing meaningful — <code>System.assert(true)</code> always passes. It only produces coverage. A reviewer will expect assertions on the outcome of <code>process()</code> (e.g. field values, created records), bulk data, and a negative case.</p>`],
["testing-115","Senior","concept",`How do you test time-dependent logic (e.g. SLAs, "created more than 7 days ago")?`,
`<ul><li><code>Test.setCreatedDate(recordId, datetime)</code> to backdate CreatedDate.</li>
<li>Inject the clock: a <code>@TestVisible static Datetime now</code> used instead of <code>System.now()</code>.</li>
<li>Avoid asserting on exact Datetime equality; compare dates or ranges.</li>
<li>Be explicit about time zone for date calculations (user TZ vs GMT).</li></ul>`]
]);
