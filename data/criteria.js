SF.add("criteria", [
["criteria-101","Mid","code",`Prevent duplicate Account names (case-insensitive, ignoring extra spaces) on insert and update, including duplicates inside the same batch.`,
`<pre><code>// before insert, before update on Account
Map&lt;String, Account&gt; byKey = new Map&lt;String, Account&gt;();
for (Account a : (List&lt;Account&gt;) Trigger.new) {
  if (a.Name == null) continue;
  if (Trigger.isUpdate &amp;&amp; a.Name == ((Account) Trigger.oldMap.get(a.Id)).Name) continue;
  String k = a.Name.normalizeSpace().toLowerCase();
  if (byKey.containsKey(k)) { a.Name.addError('Duplicate name in this batch: ' + a.Name); continue; }
  byKey.put(k, a);
}
if (byKey.isEmpty()) return;
Set&lt;String&gt; names = new Set&lt;String&gt;();
for (Account a : byKey.values()) names.add(a.Name.normalizeSpace());
for (Account e : [SELECT Id, Name FROM Account WHERE Name IN :names]) {   // SOQL '=' is case-insensitive
  Account incoming = byKey.get(e.Name.normalizeSpace().toLowerCase());
  if (incoming != null &amp;&amp; incoming.Id != e.Id) incoming.Name.addError('An account with this name already exists.');
}</code></pre>
<p>Limitation: names stored with different internal spacing aren't matched by SOQL; store a normalised key in an indexed unique field (<code>Name_Key__c</code>) for a bulletproof solution, or use Duplicate Rules.</p>`],
["criteria-102","Mid","code",`When an Opportunity's Amount goes above 1,000,000, add the Account Owner's manager to the Opportunity Team as "Executive Sponsor" with Read/Write access.`,
`<pre><code>// after insert, after update on Opportunity
Set&lt;Id&gt; oppIds = new Set&lt;Id&gt;();
for (Opportunity o : newList) {
  Decimal oldAmt = Trigger.isUpdate ? oldMap.get(o.Id).Amount : null;
  if (o.Amount &gt; 1000000 &amp;&amp; (oldAmt == null || oldAmt &lt;= 1000000)) oppIds.add(o.Id);
}
if (oppIds.isEmpty()) return;
List&lt;OpportunityTeamMember&gt; members = new List&lt;OpportunityTeamMember&gt;();
for (Opportunity o : [SELECT Id, Account.Owner.ManagerId FROM Opportunity WHERE Id IN :oppIds]) {
  Id mgr = o.Account?.Owner?.ManagerId;
  if (mgr != null) members.add(new OpportunityTeamMember(OpportunityId = o.Id, UserId = mgr,
    TeamMemberRole = 'Executive Sponsor', OpportunityAccessLevel = 'Edit'));
}
Database.insert(members, false);   // ignore if already a member / inactive user</code></pre>
<p>Requires Opportunity Teams enabled; access level "Edit" is only valid if OWD for Opportunity is Private or Read Only.</p>`],
["criteria-103","Mid","code",`Write a validation rule: Case can be Closed only if Resolution__c is filled, except Type = 'Spam'. Also prevent reopening a Case closed more than 30 days ago.`,
`<pre><code>/* Rule 1: resolution required */
AND( ISPICKVAL(Status, 'Closed'),
     ISCHANGED(Status),
     NOT(ISPICKVAL(Type, 'Spam')),
     ISBLANK(Resolution__c) )

/* Rule 2: no reopening old cases */
AND( ISCHANGED(Status),
     ISPICKVAL(PRIORVALUE(Status), 'Closed'),
     NOT(ISPICKVAL(Status, 'Closed')),
     TODAY() - DATEVALUE(ClosedDate) &gt; 30,
     NOT($Permission.Reopen_Old_Cases) )</code></pre>
<p><code>ISPICKVAL</code> is required for picklists; <code>PRIORVALUE</code> works only in update context.</p>`],
["criteria-104","Mid","code",`When an Account's Type changes to "Customer", create an onboarding checklist of Tasks. The task list must be configurable without code.`,
`<pre><code>// Custom Metadata Onboarding_Step__mdt: Subject__c, Days_Offset__c, Order__c
// after update on Account
List&lt;Account&gt; newCustomers = new List&lt;Account&gt;();
for (Account a : newList) if (a.Type == 'Customer' &amp;&amp; oldMap.get(a.Id).Type != 'Customer') newCustomers.add(a);
if (newCustomers.isEmpty()) return;
List&lt;Onboarding_Step__mdt&gt; steps = [SELECT Subject__c, Days_Offset__c FROM Onboarding_Step__mdt ORDER BY Order__c];
List&lt;Task&gt; tasks = new List&lt;Task&gt;();
for (Account a : newCustomers) for (Onboarding_Step__mdt s : steps) {
  tasks.add(new Task(WhatId = a.Id, OwnerId = a.OwnerId, Subject = s.Subject__c,
    ActivityDate = Date.today().addDays(s.Days_Offset__c.intValue()), Status = 'Not Started'));
}
insert tasks;</code></pre>
<p>Custom Metadata queries don't count toward the SOQL limit. Admins add steps by creating metadata records.</p>`],
["criteria-105","Mid","code",`On Contact insert, if the Mailing Address is blank, copy the Account's Billing Address.`,
`<pre><code>// before insert on Contact
Set&lt;Id&gt; accIds = new Set&lt;Id&gt;();
for (Contact c : newList) if (c.AccountId != null &amp;&amp; String.isBlank(c.MailingStreet) &amp;&amp; String.isBlank(c.MailingCity)) accIds.add(c.AccountId);
if (accIds.isEmpty()) return;
Map&lt;Id, Account&gt; accs = new Map&lt;Id, Account&gt;([SELECT Id, BillingStreet, BillingCity, BillingState,
  BillingPostalCode, BillingCountry FROM Account WHERE Id IN :accIds]);
for (Contact c : newList) {
  Account a = accs.get(c.AccountId);
  if (a == null || !String.isBlank(c.MailingStreet) || !String.isBlank(c.MailingCity)) continue;
  c.MailingStreet = a.BillingStreet; c.MailingCity = a.BillingCity; c.MailingState = a.BillingState;
  c.MailingPostalCode = a.BillingPostalCode; c.MailingCountry = a.BillingCountry;
}</code></pre>
<p>Before insert, so no DML. A before-save flow can also do this without code.</p>`],
["criteria-106","Mid","code",`When a Lead is converted, copy Lead_Score__c and Source_Detail__c to the new Contact and Opportunity.`,
`<p>First choice: Lead Field Mapping (Setup → Lead → Map Lead Fields), no code. If logic is needed:</p>
<pre><code>// after update on Lead
List&lt;SObject&gt; upd = new List&lt;SObject&gt;();
for (Lead l : newList) {
  if (!l.IsConverted || oldMap.get(l.Id).IsConverted) continue;
  if (l.ConvertedContactId != null)
    upd.add(new Contact(Id = l.ConvertedContactId, Lead_Score__c = l.Lead_Score__c, Source_Detail__c = l.Source_Detail__c));
  if (l.ConvertedOpportunityId != null)
    upd.add(new Opportunity(Id = l.ConvertedOpportunityId, Lead_Score__c = l.Lead_Score__c));
}
update upd;</code></pre>`],
["criteria-107","Senior","code",`Every night, flag open Opportunities with no activity in 30 days as Stale and send each owner ONE email listing their stale deals.`,
`<pre><code>public class StaleOppBatch implements Database.Batchable&lt;SObject&gt;, Database.Stateful, Schedulable {
  Map&lt;Id, List&lt;String&gt;&gt; byOwner = new Map&lt;Id, List&lt;String&gt;&gt;();
  public Database.QueryLocator start(Database.BatchableContext bc) {
    Date cutoff = Date.today().addDays(-30);
    return Database.getQueryLocator([SELECT Id, Name, OwnerId FROM Opportunity WHERE IsClosed = false
      AND Is_Stale__c = false AND (LastActivityDate &lt; :cutoff OR (LastActivityDate = null AND CreatedDate &lt; LAST_N_DAYS:30))]);
  }
  public void execute(Database.BatchableContext bc, List&lt;Opportunity&gt; scope) {
    for (Opportunity o : scope) {
      o.Is_Stale__c = true;
      if (!byOwner.containsKey(o.OwnerId)) byOwner.put(o.OwnerId, new List&lt;String&gt;());
      byOwner.get(o.OwnerId).add(o.Name);
    }
    Database.update(scope, false);
  }
  public void finish(Database.BatchableContext bc) {
    List&lt;Messaging.SingleEmailMessage&gt; mails = new List&lt;Messaging.SingleEmailMessage&gt;();
    for (Id owner : byOwner.keySet()) {
      Messaging.SingleEmailMessage m = new Messaging.SingleEmailMessage();
      m.setTargetObjectId(owner); m.setSaveAsActivity(false);
      m.setSubject(byOwner.get(owner).size() + ' stale opportunities');
      m.setPlainTextBody('No activity for 30 days:\n- ' + String.join(byOwner.get(owner), '\n- '));
      mails.add(m);
    }
    if (!mails.isEmpty()) Messaging.sendEmail(mails, false);
  }
  public void execute(SchedulableContext sc) { Database.executeBatch(this, 200); }
}</code></pre>
<p>Stateful keeps the per-owner map across chunks; emails to internal users via TargetObjectId don't consume the external email limit. For very large orgs, store names count only to keep heap small.</p>`],
["criteria-108","Mid","code",`Write SOQL for the top 5 Accounts by number of Closed Won Opportunities this fiscal year, with their total amount.`,
`<pre><code>SELECT AccountId, Account.Name, COUNT(Id) wins, SUM(Amount) total
FROM Opportunity
WHERE StageName = 'Closed Won' AND CloseDate = THIS_FISCAL_YEAR AND AccountId != null
GROUP BY AccountId, Account.Name
ORDER BY COUNT(Id) DESC
LIMIT 5</code></pre>
<p>Grouping by <code>Account.Name</code> lets you return the name without a second query. Use <code>IsWon = true</code> instead of the stage label if stages are renamed.</p>`],
["criteria-109","Mid","code",`Write SOQL: Contacts who have had no Cases in the last 6 months but whose Account has at least one open Opportunity.`,
`<pre><code>SELECT Id, Name, Email, AccountId FROM Contact
WHERE Id NOT IN (SELECT ContactId FROM Case WHERE CreatedDate = LAST_N_MONTHS:6 AND ContactId != null)
AND AccountId IN (SELECT AccountId FROM Opportunity WHERE IsClosed = false)</code></pre>
<p>One anti-join and one semi-join on different fields are allowed together. Note <code>ContactId != null</code> inside the anti-join subquery; nulls in NOT IN subqueries can otherwise produce surprising results.</p>`],
["criteria-110","Mid","code",`A Contact may have at most 3 open High-priority Cases. Enforce it on insert and update.`,
`<pre><code>// before insert, before update on Case
Map&lt;Id, List&lt;Case&gt;&gt; incoming = new Map&lt;Id, List&lt;Case&gt;&gt;();
for (Case c : newList) {
  Boolean relevant = c.ContactId != null &amp;&amp; c.Priority == 'High' &amp;&amp; !c.IsClosed;
  if (Trigger.isUpdate) {
    Case o = oldMap.get(c.Id);
    relevant = relevant &amp;&amp; (o.Priority != 'High' || o.ContactId != c.ContactId || o.IsClosed);
  }
  if (!relevant) continue;
  if (!incoming.containsKey(c.ContactId)) incoming.put(c.ContactId, new List&lt;Case&gt;());
  incoming.get(c.ContactId).add(c);
}
if (incoming.isEmpty()) return;
Map&lt;Id, Integer&gt; existing = new Map&lt;Id, Integer&gt;();
for (AggregateResult ar : [SELECT ContactId cid, COUNT(Id) n FROM Case WHERE ContactId IN :incoming.keySet()
     AND Priority = 'High' AND IsClosed = false GROUP BY ContactId]) existing.put((Id) ar.get('cid'), (Integer) ar.get('n'));
for (Id cid : incoming.keySet()) {
  Integer count = existing.containsKey(cid) ? existing.get(cid) : 0;
  for (Case c : incoming.get(cid)) {
    count++;
    if (count &gt; 3) c.addError('This contact already has 3 open high-priority cases.');
  }
}</code></pre>
<p><code>IsClosed</code> is derived from Status and may not be updated yet in before triggers when Status changes in the same save; checking the Status values directly (or the CaseStatus metadata) is safer in production.</p>`],
["criteria-111","Senior","code",`If an Opportunity's Stage moves backward (e.g. Negotiation → Qualification), require Stage_Regression_Reason__c and log the change.`,
`<pre><code>// before update on Opportunity
Map&lt;String, Integer&gt; order = new Map&lt;String, Integer&gt;();
for (OpportunityStage s : [SELECT ApiName, SortOrder FROM OpportunityStage WHERE IsActive = true]) order.put(s.ApiName, s.SortOrder);
List&lt;Stage_Change__c&gt; logs = new List&lt;Stage_Change__c&gt;();
for (Opportunity o : newList) {
  String oldStage = oldMap.get(o.Id).StageName;
  if (o.StageName == oldStage || !order.containsKey(o.StageName) || !order.containsKey(oldStage)) continue;
  if (order.get(o.StageName) &lt; order.get(oldStage)) {
    if (String.isBlank(o.Stage_Regression_Reason__c)) {
      o.Stage_Regression_Reason__c.addError('Explain why the stage moved backward.');
    } else {
      logs.add(new Stage_Change__c(Opportunity__c = o.Id, From__c = oldStage, To__c = o.StageName,
        Reason__c = o.Stage_Regression_Reason__c));
      o.Stage_Regression_Reason__c = null;   // clear for next time
    }
  }
}
OpportunityTriggerHandler.pendingInserts.addAll(logs);   // insert in after update</code></pre>
<p>Reading stage order from <code>OpportunityStage</code> avoids hard-coding and survives renamed stages.</p>`],
["criteria-112","Mid","code",`Roll up the total NumberOfEmployees of child Accounts to Total_Group_Employees__c on the parent Account.`,
`<pre><code>// after insert, update, delete, undelete on Account
Set&lt;Id&gt; parents = new Set&lt;Id&gt;();
for (Account a : Trigger.isDelete ? (List&lt;Account&gt;) Trigger.old : (List&lt;Account&gt;) Trigger.new) {
  Account old = Trigger.isUpdate ? (Account) Trigger.oldMap.get(a.Id) : null;
  if (old == null || a.ParentId != old.ParentId || a.NumberOfEmployees != old.NumberOfEmployees) {
    if (a.ParentId != null) parents.add(a.ParentId);
    if (old != null &amp;&amp; old.ParentId != null) parents.add(old.ParentId);
  }
}
parents.removeAll(AccountRollupGuard.done);    // avoid re-processing when parents update
if (parents.isEmpty()) return;
AccountRollupGuard.done.addAll(parents);
Map&lt;Id, Account&gt; upd = new Map&lt;Id, Account&gt;();
for (Id p : parents) upd.put(p, new Account(Id = p, Total_Group_Employees__c = 0));
for (AggregateResult ar : [SELECT ParentId p, SUM(NumberOfEmployees) s FROM Account
     WHERE ParentId IN :parents GROUP BY ParentId]) {
  upd.get((Id) ar.get('p')).Total_Group_Employees__c = (Decimal) ar.get('s');
}
update upd.values();</code></pre>
<p>Updating the parent fires the trigger again for the parent's own parent — this naturally rolls up multiple levels if the parent's total is included in its own parent's calculation (decide whether the rollup is direct children only or the whole tree).</p>`],
["criteria-113","Senior","code",`When an Account is marked inactive, deactivate all its Experience Cloud users.`,
`<pre><code>// after update on Account
Set&lt;Id&gt; inactive = new Set&lt;Id&gt;();
for (Account a : newList) if (a.Active__c == false &amp;&amp; oldMap.get(a.Id).Active__c == true) inactive.add(a.Id);
if (!inactive.isEmpty()) System.enqueueJob(new DeactivatePortalUsers(inactive));

public class DeactivatePortalUsers implements Queueable {
  Set&lt;Id&gt; accIds;
  public DeactivatePortalUsers(Set&lt;Id&gt; ids) { accIds = ids; }
  public void execute(QueueableContext ctx) {
    List&lt;User&gt; users = [SELECT Id FROM User WHERE IsActive = true AND Contact.AccountId IN :accIds];
    for (User u : users) u.IsActive = false;
    Database.update(users, false);
  }
}</code></pre>
<p>User is a setup object: updating it in the Account transaction causes MIXED_DML_OPERATION, hence the Queueable.</p>`],
["criteria-114","Senior","code",`When a Product's price changes in the Standard Price Book, update UnitPrice on all open Opportunity Line Items for that product, unless the line was manually discounted.`,
`<pre><code>// after update on PricebookEntry
Map&lt;Id, Decimal&gt; newPrice = new Map&lt;Id, Decimal&gt;();
for (PricebookEntry p : (List&lt;PricebookEntry&gt;) Trigger.new) {
  PricebookEntry o = (PricebookEntry) Trigger.oldMap.get(p.Id);
  if (p.UnitPrice != o.UnitPrice) newPrice.put(p.Id, p.UnitPrice);
}
if (newPrice.isEmpty()) return;
List&lt;OpportunityLineItem&gt; lines = [SELECT Id, PricebookEntryId FROM OpportunityLineItem
  WHERE PricebookEntryId IN :newPrice.keySet() AND Opportunity.IsClosed = false
  AND (Discount = null OR Discount = 0) AND Manual_Price__c = false];
for (OpportunityLineItem l : lines) l.UnitPrice = newPrice.get(l.PricebookEntryId);
if (lines.size() &gt; 5000) System.enqueueJob(new UpdateLinesJob(lines));   // stay under DML limits
else update lines;</code></pre>
<p>Talking points: price changes on many open deals may surprise reps (often business prefers price locked at quote time), and synced quotes will update as well.</p>`],
["criteria-115","Mid","code",`Build an LWC that shows a red banner on the Account page when the Account has overdue invoices, with the count and total.`,
`<pre><code>// overdueBanner.html
&lt;template&gt;
  &lt;template lwc:if={hasOverdue}&gt;
    &lt;div class="slds-notify slds-notify_alert slds-alert_error" role="alert"&gt;
      {summary.count} overdue invoices totalling {formattedTotal}
    &lt;/div&gt;
  &lt;/template&gt;
&lt;/template&gt;

// overdueBanner.js
import { LightningElement, api, wire } from 'lwc';
import getOverdue from '@salesforce/apex/InvoiceCtrl.getOverdue';
export default class OverdueBanner extends LightningElement {
  @api recordId; summary;
  @wire(getOverdue, { accountId: '$recordId' }) wired({ data }) { this.summary = data; }
  get hasOverdue() { return this.summary &amp;&amp; this.summary.count &gt; 0; }
  get formattedTotal() {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(this.summary.total);
  }
}

// InvoiceCtrl.cls
@AuraEnabled(cacheable=true)
public static Map&lt;String, Object&gt; getOverdue(Id accountId) {
  AggregateResult ar = [SELECT COUNT(Id) c, SUM(Balance__c) s FROM Invoice__c
    WHERE Account__c = :accountId AND Due_Date__c &lt; TODAY AND Balance__c &gt; 0 WITH USER_MODE];
  return new Map&lt;String, Object&gt;{ 'count' =&gt; ar.get('c'), 'total' =&gt; ar.get('s') ?? 0 };
}</code></pre>`],
["criteria-116","Senior","code",`When specific Account fields change and Sync_to_ERP__c is true, send the Account to the ERP asynchronously, once per transaction, even if the Account is updated several times.`,
`<pre><code>public class ErpSync {
  static final Set&lt;String&gt; FIELDS = new Set&lt;String&gt;{ 'Name', 'BillingCity', 'BillingCountry', 'Phone', 'Tax_Id__c' };
  static Set&lt;Id&gt; queued = new Set&lt;Id&gt;();
  public static void onAfterUpdate(List&lt;Account&gt; newList, Map&lt;Id, Account&gt; oldMap) {
    if (System.isFuture() || System.isBatch() || UserInfo.getUserId() == IntegrationUsers.ERP) return; // no loops
    Set&lt;Id&gt; toSend = new Set&lt;Id&gt;();
    for (Account a : newList) {
      if (!a.Sync_to_ERP__c || queued.contains(a.Id)) continue;
      for (String f : FIELDS) if (a.get(f) != oldMap.get(a.Id).get(f)) { toSend.add(a.Id); break; }
    }
    if (toSend.isEmpty()) return;
    queued.addAll(toSend);
    System.enqueueJob(new ErpSyncJob(toSend));
  }
}</code></pre>
<p>Key points: field-change filter, static set to dedupe across re-entries, skip updates made by the ERP integration user, Queueable with AllowsCallouts re-queries fresh data before sending. For larger scale, write to an outbox object instead of enqueuing directly.</p>`],
["criteria-117","Mid","code",`When a parent Case is closed, close all its open child Cases and copy the parent's resolution.`,
`<pre><code>// after update on Case
Map&lt;Id, Case&gt; closedParents = new Map&lt;Id, Case&gt;();
for (Case c : newList) if (c.IsClosed &amp;&amp; !oldMap.get(c.Id).IsClosed) closedParents.put(c.Id, c);
if (closedParents.isEmpty()) return;
List&lt;Case&gt; children = [SELECT Id, ParentId FROM Case WHERE ParentId IN :closedParents.keySet() AND IsClosed = false];
for (Case ch : children) {
  ch.Status = 'Closed';
  ch.Resolution__c = 'Closed with parent: ' + closedParents.get(ch.ParentId).Resolution__c;
}
update children;</code></pre>
<p>The children update fires the Case trigger again; it's harmless here because children aren't parents in this batch, but multi-level hierarchies need a recursion guard.</p>`],
["criteria-118","Mid","code",`When a completed "Call" Task is logged on a Lead, increment Call_Attempts__c; at 3 attempts set Lead Status to "Contacted - No Response".`,
`<pre><code>// after insert, after update on Task
Set&lt;Id&gt; leadIds = new Set&lt;Id&gt;();
for (Task t : newList) {
  Boolean nowDone = t.Status == 'Completed' &amp;&amp; t.Type == 'Call' &amp;&amp; t.WhoId != null
    &amp;&amp; t.WhoId.getSObjectType() == Lead.SObjectType;
  Boolean wasDone = Trigger.isUpdate &amp;&amp; oldMap.get(t.Id).Status == 'Completed';
  if (nowDone &amp;&amp; !wasDone) leadIds.add(t.WhoId);
}
if (leadIds.isEmpty()) return;
List&lt;Lead&gt; upd = new List&lt;Lead&gt;();
for (AggregateResult ar : [SELECT WhoId w, COUNT(Id) n FROM Task WHERE WhoId IN :leadIds
     AND Type = 'Call' AND Status = 'Completed' GROUP BY WhoId]) {
  Integer n = (Integer) ar.get('n');
  Lead l = new Lead(Id = (Id) ar.get('w'), Call_Attempts__c = n);
  if (n &gt;= 3) l.Status = 'Contacted - No Response';
  upd.add(l);
}
update upd;</code></pre>
<p>Recounting with an aggregate (instead of +1) stays correct after deletes and repeated saves. Note <code>WhoId</code> is polymorphic.</p>`],
["criteria-119","Mid","code",`If an Opportunity's Discount__c is above 15%, automatically submit it for approval after save.`,
`<pre><code>// after insert, after update on Opportunity
List&lt;Approval.ProcessSubmitRequest&gt; reqs = new List&lt;Approval.ProcessSubmitRequest&gt;();
for (Opportunity o : newList) {
  Decimal oldD = Trigger.isUpdate ? oldMap.get(o.Id).Discount__c : null;
  if (o.Discount__c &gt; 15 &amp;&amp; (oldD == null || oldD &lt;= 15) &amp;&amp; !Approval.isLocked(o.Id)) {
    Approval.ProcessSubmitRequest r = new Approval.ProcessSubmitRequest();
    r.setObjectId(o.Id);
    r.setProcessDefinitionNameOrId('Discount_Approval');
    r.setComments('Auto-submitted: discount ' + o.Discount__c + '%');
    reqs.add(r);
  }
}
if (!reqs.isEmpty()) Approval.process(reqs, false);</code></pre>
<p>The approval process entry criteria must also allow the record. Flow can do the same with the "Submit for Approval" action.</p>`],
["criteria-120","Mid","code",`Flag Contacts whose email domain doesn't match their Account's website domain (warning, not blocking).`,
`<pre><code>// before insert, before update on Contact
Set&lt;Id&gt; accIds = new Set&lt;Id&gt;();
for (Contact c : newList) if (c.AccountId != null &amp;&amp; c.Email != null) accIds.add(c.AccountId);
Map&lt;Id, Account&gt; accs = new Map&lt;Id, Account&gt;([SELECT Id, Website FROM Account WHERE Id IN :accIds AND Website != null]);
for (Contact c : newList) {
  Account a = accs.get(c.AccountId);
  if (a == null || c.Email == null) { c.Domain_Mismatch__c = false; continue; }
  String site = a.Website.toLowerCase().removeStart('https://').removeStart('http://').removeStart('www.').substringBefore('/');
  String mail = c.Email.substringAfter('@').toLowerCase();
  c.Domain_Mismatch__c = !(mail == site || mail.endsWith('.' + site));
}</code></pre>
<p>A flag plus a list view or a highlights-panel badge warns users without blocking legitimate cases like personal emails.</p>`],
["criteria-121","Senior","code",`Write a batch that merges duplicate Contacts with the same email under the same Account, keeping the most recently modified.`,
`<pre><code>public class ContactDedupBatch implements Database.Batchable&lt;AggregateResult&gt; {
  public Iterable&lt;AggregateResult&gt; start(Database.BatchableContext bc) {
    return [SELECT AccountId acc, Email em FROM Contact WHERE Email != null AND AccountId != null
            GROUP BY AccountId, Email HAVING COUNT(Id) &gt; 1 LIMIT 50000];
  }
  public void execute(Database.BatchableContext bc, List&lt;AggregateResult&gt; scope) {
    for (AggregateResult g : scope) {
      Id accId = (Id) g.get('acc');
      String email = (String) g.get('em');
      List&lt;Contact&gt; dupes = [SELECT Id FROM Contact WHERE AccountId = :accId
        AND Email = :email ORDER BY LastModifiedDate DESC];
      Contact master = dupes.remove(0);
      while (!dupes.isEmpty()) {             // merge max 2 at a time into master
        List&lt;Contact&gt; chunk = new List&lt;Contact&gt;();
        while (!dupes.isEmpty() &amp;&amp; chunk.size() &lt; 2) chunk.add(dupes.remove(0));
        Database.merge(master, chunk, false);
      }
    }
  }
  public void finish(Database.BatchableContext bc) {}
}
// run with a small scope because execute queries per group: Database.executeBatch(new ContactDedupBatch(), 20);</code></pre>
<p>An aggregate query in <code>start</code> must return an Iterable (subject to the 50k row and aggregate limits). Each merge counts as DML; with scope 20 and up to a few merges per group you stay under 150. Duplicate Jobs or a dedupe app may be more practical for large orgs.</p>`],
["criteria-122","Senior","code",`Prevent double-booking: a user can't have two Events that overlap in time.`,
`<pre><code>// before insert, before update on Event
Set&lt;Id&gt; owners = new Set&lt;Id&gt;();
Datetime minStart, maxEnd;
for (Event e : newList) {
  if (e.IsAllDayEvent || e.StartDateTime == null) continue;
  owners.add(e.OwnerId);
  minStart = (minStart == null || e.StartDateTime &lt; minStart) ? e.StartDateTime : minStart;
  maxEnd = (maxEnd == null || e.EndDateTime &gt; maxEnd) ? e.EndDateTime : maxEnd;
}
if (owners.isEmpty()) return;
List&lt;Event&gt; candidates = [SELECT Id, OwnerId, StartDateTime, EndDateTime FROM Event
  WHERE OwnerId IN :owners AND IsAllDayEvent = false
  AND StartDateTime &lt; :maxEnd AND EndDateTime &gt; :minStart];
candidates.addAll(newList);   // also compare against events in this same batch
for (Event e : newList) {
  if (e.IsAllDayEvent || e.StartDateTime == null) continue;
  for (Event other : candidates) {
    if (other === e || (other.Id != null &amp;&amp; other.Id == e.Id) || other.OwnerId != e.OwnerId) continue;
    if (e.StartDateTime &lt; other.EndDateTime &amp;&amp; other.StartDateTime &lt; e.EndDateTime) {
      e.addError('This overlaps another event for the same user.'); break;
    }
  }
}</code></pre>
<p>Overlap rule: A starts before B ends and B starts before A ends. The nested loop is fine for small batches; for large ones group candidates by owner in a Map first.</p>`],
["criteria-123","Mid","code",`Return the business hours (not calendar time) each closed Case took to resolve.`,
`<pre><code>public static Map&lt;Id, Decimal&gt; resolutionHours(Set&lt;Id&gt; caseIds) {
  Id bh = [SELECT Id FROM BusinessHours WHERE IsDefault = true].Id;
  Map&lt;Id, Decimal&gt; out = new Map&lt;Id, Decimal&gt;();
  for (Case c : [SELECT Id, CreatedDate, ClosedDate, BusinessHoursId FROM Case WHERE Id IN :caseIds AND IsClosed = true]) {
    Id useBh = c.BusinessHoursId != null ? c.BusinessHoursId : bh;
    Long ms = BusinessHours.diff(useBh, c.CreatedDate, c.ClosedDate);
    out.put(c.Id, Decimal.valueOf(ms).divide(3600000, 2));
  }
  return out;
}</code></pre>
<p><code>BusinessHours.diff</code> returns milliseconds within business hours, respecting holidays associated with the business hours.</p>`],
["criteria-124","Mid","code",`Set Account Rating automatically from AnnualRevenue and Industry using a configurable mapping.`,
`<pre><code>// Rating_Rule__mdt: Industry__c (blank = any), Min_Revenue__c, Rating__c, Priority__c
// before insert, before update on Account
List&lt;Rating_Rule__mdt&gt; rules = [SELECT Industry__c, Min_Revenue__c, Rating__c FROM Rating_Rule__mdt
  ORDER BY Priority__c];
for (Account a : newList) {
  if (Trigger.isUpdate &amp;&amp; a.AnnualRevenue == oldMap.get(a.Id).AnnualRevenue
      &amp;&amp; a.Industry == oldMap.get(a.Id).Industry) continue;
  a.Rating = null;
  for (Rating_Rule__mdt r : rules) {
    Boolean industryOk = String.isBlank(r.Industry__c) || r.Industry__c == a.Industry;
    if (industryOk &amp;&amp; a.AnnualRevenue != null &amp;&amp; a.AnnualRevenue &gt;= r.Min_Revenue__c) { a.Rating = r.Rating__c; break; }
  }
}</code></pre>`],
["criteria-125","Mid","code",`Prevent the same Product being added twice to one Opportunity.`,
`<pre><code>// before insert on OpportunityLineItem
Set&lt;Id&gt; oppIds = new Set&lt;Id&gt;();
for (OpportunityLineItem l : newList) oppIds.add(l.OpportunityId);
Set&lt;String&gt; existing = new Set&lt;String&gt;();
for (OpportunityLineItem e : [SELECT OpportunityId, Product2Id FROM OpportunityLineItem WHERE OpportunityId IN :oppIds]) {
  existing.add(e.OpportunityId + '|' + e.Product2Id);
}
Map&lt;Id, Id&gt; productByPbe = new Map&lt;Id, Id&gt;();
for (OpportunityLineItem l : newList) productByPbe.put(l.PricebookEntryId, null);
for (PricebookEntry p : [SELECT Id, Product2Id FROM PricebookEntry WHERE Id IN :productByPbe.keySet()]) productByPbe.put(p.Id, p.Product2Id);
for (OpportunityLineItem l : newList) {
  String k = l.OpportunityId + '|' + productByPbe.get(l.PricebookEntryId);
  if (existing.contains(k)) l.addError('This product is already on the opportunity.');
  else existing.add(k);   // catches duplicates within the same insert
}</code></pre>
<p>In before insert, <code>Product2Id</code> on the line may not be populated yet, so it's derived from the PricebookEntry.</p>`],
["criteria-126","Mid","code",`On Lead insert, if Company matches an existing Account name, assign the Lead to that Account's owner.`,
`<pre><code>// before insert on Lead
Set&lt;String&gt; companies = new Set&lt;String&gt;();
for (Lead l : newList) if (String.isNotBlank(l.Company)) companies.add(l.Company.trim());
Map&lt;String, Id&gt; ownerByName = new Map&lt;String, Id&gt;();
for (Account a : [SELECT Name, OwnerId, Owner.IsActive FROM Account WHERE Name IN :companies]) {
  if (a.Owner.IsActive) ownerByName.put(a.Name.toLowerCase(), a.OwnerId);
}
for (Lead l : newList) {
  Id owner = l.Company == null ? null : ownerByName.get(l.Company.trim().toLowerCase());
  if (owner != null) l.OwnerId = owner;
}</code></pre>
<p>Assignment rules run after before triggers when the DML uses assignment rules (e.g. web-to-lead) and would overwrite the owner; coordinate with the rules or skip them for matched leads.</p>`],
["criteria-127","Senior","code",`When Generate_Invoice__c is checked on a Closed Won Opportunity, create an Invoice with lines from its products and uncheck the box. Must be safe for bulk updates.`,
`<pre><code>// after update on Opportunity → enqueue
Set&lt;Id&gt; ids = new Set&lt;Id&gt;();
for (Opportunity o : newList) if (o.Generate_Invoice__c &amp;&amp; !oldMap.get(o.Id).Generate_Invoice__c &amp;&amp; o.IsWon) ids.add(o.Id);
if (!ids.isEmpty()) System.enqueueJob(new InvoiceJob(ids));

public class InvoiceJob implements Queueable {
  Set&lt;Id&gt; oppIds;
  public InvoiceJob(Set&lt;Id&gt; ids) { oppIds = ids; }
  public void execute(QueueableContext ctx) {
    List&lt;Opportunity&gt; opps = [SELECT Id, AccountId, (SELECT Product2Id, Quantity, UnitPrice FROM OpportunityLineItems)
      FROM Opportunity WHERE Id IN :oppIds AND Generate_Invoice__c = true];
    Map&lt;Id, Invoice__c&gt; invByOpp = new Map&lt;Id, Invoice__c&gt;();
    for (Opportunity o : opps) invByOpp.put(o.Id, new Invoice__c(Opportunity__c = o.Id, Account__c = o.AccountId));
    Savepoint sp = Database.setSavepoint();
    try {
      insert invByOpp.values();
      List&lt;Invoice_Line__c&gt; lines = new List&lt;Invoice_Line__c&gt;();
      for (Opportunity o : opps) for (OpportunityLineItem l : o.OpportunityLineItems)
        lines.add(new Invoice_Line__c(Invoice__c = invByOpp.get(o.Id).Id, Product__c = l.Product2Id,
          Quantity__c = l.Quantity, Unit_Price__c = l.UnitPrice));
      insert lines;
      for (Opportunity o : opps) o.Generate_Invoice__c = false;
      update opps;
    } catch (Exception e) { Database.rollback(sp); throw e; }
  }
}</code></pre>
<p>Re-checking <code>Generate_Invoice__c = true</code> in the query makes the job idempotent if it runs twice.</p>`],
["criteria-128","Mid","code",`When a customer adds a public comment to a Case from the portal, set Case Status to "Customer Responded" and notify the owner.`,
`<pre><code>// after insert on CaseComment
Set&lt;Id&gt; caseIds = new Set&lt;Id&gt;();
Set&lt;Id&gt; authors = new Set&lt;Id&gt;();
for (CaseComment cc : newList) if (cc.IsPublished) { caseIds.add(cc.ParentId); authors.add(cc.CreatedById); }
Map&lt;Id, User&gt; external = new Map&lt;Id, User&gt;([SELECT Id FROM User WHERE Id IN :authors AND ContactId != null]);
List&lt;Case&gt; upd = new List&lt;Case&gt;();
for (CaseComment cc : newList) {
  if (cc.IsPublished &amp;&amp; external.containsKey(cc.CreatedById)) upd.add(new Case(Id = cc.ParentId, Status = 'Customer Responded'));
}
update upd;   // a record-triggered flow on Case status change sends the Custom Notification to OwnerId</code></pre>
<p>Use a Map keyed by case Id if several comments arrive for the same case in one batch, to avoid "Duplicate id in list".</p>`],
["criteria-129","Mid","code",`Write SOQL: Accounts where every Opportunity is Closed Lost (they have opportunities, but none open or won).`,
`<pre><code>SELECT Id, Name FROM Account
WHERE Id IN (SELECT AccountId FROM Opportunity)
AND Id NOT IN (SELECT AccountId FROM Opportunity WHERE IsWon = true OR IsClosed = false)</code></pre>
<p>"Has at least one" via semi-join, "has none of the other kind" via anti-join. These lists are good targets for win-back campaigns.</p>`],
["criteria-130","Mid","code",`Validation rule: Indian accounts must have a 10-digit mobile number starting with 6–9, optionally prefixed by +91.`,
`<pre><code>AND(
  BillingCountry = 'India',
  NOT(ISBLANK(Phone)),
  NOT(REGEX(SUBSTITUTE(SUBSTITUTE(Phone, ' ', ''), '-', ''), '^(\\\\+91)?[6-9][0-9]{9}$'))
)</code></pre>
<p>Normalise spaces/dashes with SUBSTITUTE before REGEX; in the formula editor the backslash before + is written as two backslashes. Consider a country picklist (State and Country picklists) instead of free text.</p>`],
["criteria-131","Senior","code",`When an Opportunity is Closed Won, Amount &gt; 50,000 and Account Type is "Customer", create a Project with template tasks. Must never create two projects for one deal.`,
`<pre><code>// after update on Opportunity
Set&lt;Id&gt; won = new Set&lt;Id&gt;();
for (Opportunity o : newList) if (o.IsWon &amp;&amp; !oldMap.get(o.Id).IsWon &amp;&amp; o.Amount &gt; 50000) won.add(o.Id);
if (won.isEmpty()) return;
Set&lt;Id&gt; hasProject = new Set&lt;Id&gt;();
for (Project__c p : [SELECT Opportunity__c FROM Project__c WHERE Opportunity__c IN :won]) hasProject.add(p.Opportunity__c);
List&lt;Project__c&gt; projects = new List&lt;Project__c&gt;();
for (Opportunity o : [SELECT Id, Name, AccountId, OwnerId FROM Opportunity WHERE Id IN :won AND Account.Type = 'Customer']) {
  if (hasProject.contains(o.Id)) continue;
  projects.add(new Project__c(Name = o.Name, Opportunity__c = o.Id, Account__c = o.AccountId,
    Opportunity_Key__c = o.Id));   // unique text field = hard guarantee
}
Database.SaveResult[] res = Database.insert(projects, false);   // duplicates rejected by the unique field
// then create Project_Task__c records from Custom Metadata templates for the successful projects</code></pre>
<p>The query check handles normal cases; a <b>unique</b> field holding the Opportunity Id handles concurrent saves (two users closing the same deal at once).</p>`],
["criteria-132","Mid","design",`Without code: set Case Priority to High when Origin is Phone and the Account's SLA is Gold, otherwise Medium. Explain how you'd build it.`,
`<ul><li>Record-triggered flow on Case, <b>before-save</b> ("Fast Field Updates"), on create and update when Origin or AccountId changes.</li>
<li>Decision: <code>{!$Record.Origin} = 'Phone'</code> AND <code>{!$Record.Account.SLA__c} = 'Gold'</code> (before-save flows can read parent fields through the record variable).</li>
<li>Assignment: <code>$Record.Priority</code> = High, default branch Medium.</li>
<li>No DML element needed. Set trigger order if other Case flows exist, and test bulk via Data Loader.</li></ul>`],
["criteria-133","Senior","code",`Build file upload on a Case that accepts only PDF/JPG/PNG up to 5 MB and renames the file to "CaseNumber - original name".`,
`<pre><code>&lt;!-- html --&gt;
&lt;lightning-file-upload label="Attach evidence" record-id={recordId}
  accept={acceptedFormats} onuploadfinished={handleDone} multiple&gt;&lt;/lightning-file-upload&gt;

// js
acceptedFormats = ['.pdf', '.jpg', '.jpeg', '.png'];
async handleDone(e) {
  const ids = e.detail.files.map(f =&gt; f.documentId);
  await renameFiles({ caseId: this.recordId, documentIds: ids });
}

// Apex
@AuraEnabled
public static void renameFiles(Id caseId, List&lt;Id&gt; documentIds) {
  String num = [SELECT CaseNumber FROM Case WHERE Id = :caseId WITH USER_MODE].CaseNumber;
  List&lt;ContentDocument&gt; docs = [SELECT Id, Title FROM ContentDocument WHERE Id IN :documentIds];
  for (ContentDocument d : docs) d.Title = num + ' - ' + d.Title;
  update docs;
}</code></pre>
<p><code>accept</code> filters by extension only in the UI. Enforce size and type server side with a trigger on ContentVersion (check <code>ContentSize</code> and <code>FileExtension</code>, addError if invalid). Org-level file size limits still apply.</p>`],
["criteria-134","Senior","code",`A Case of Type "Damage" can't be closed unless at least one image file is attached.`,
`<pre><code>// before update on Case
Set&lt;Id&gt; closing = new Set&lt;Id&gt;();
for (Case c : newList) if (c.Type == 'Damage' &amp;&amp; c.Status == 'Closed' &amp;&amp; oldMap.get(c.Id).Status != 'Closed') closing.add(c.Id);
if (closing.isEmpty()) return;
Set&lt;Id&gt; withImage = new Set&lt;Id&gt;();
for (ContentDocumentLink l : [SELECT LinkedEntityId FROM ContentDocumentLink WHERE LinkedEntityId IN :closing
     AND ContentDocument.FileType IN ('JPG', 'JPEG', 'PNG')]) withImage.add(l.LinkedEntityId);
for (Case c : newList) if (closing.contains(c.Id) &amp;&amp; !withImage.contains(c.Id))
  c.addError('Attach at least one photo of the damage before closing.');</code></pre>
<p>Querying ContentDocumentLink requires a filter on <code>LinkedEntityId</code> or <code>ContentDocumentId</code> — which this query has.</p>`],
["criteria-135","Mid","code",`Store on each Account the number of distinct Products it has ever bought (from Closed Won deals).`,
`<pre><code>public static void recalc(Set&lt;Id&gt; accIds) {
  Map&lt;Id, Account&gt; upd = new Map&lt;Id, Account&gt;();
  for (Id a : accIds) upd.put(a, new Account(Id = a, Distinct_Products__c = 0));
  for (AggregateResult ar : [SELECT Opportunity.AccountId acc, COUNT_DISTINCT(Product2Id) n
       FROM OpportunityLineItem WHERE Opportunity.IsWon = true AND Opportunity.AccountId IN :accIds
       GROUP BY Opportunity.AccountId]) {
    upd.get((Id) ar.get('acc')).Distinct_Products__c = (Integer) ar.get('n');
  }
  update upd.values();
}</code></pre>
<p>Call it from Opportunity (won/unwon, account change) and OpportunityLineItem (insert/delete) triggers, or nightly in a batch if real time isn't needed.</p>`]
]);
