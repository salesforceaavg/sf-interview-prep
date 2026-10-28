SF.add("sales", [
["sales-101","Senior","code",`Convert Leads in bulk from Apex, merging into existing Accounts by domain, without creating Opportunities.`,
`<pre><code>public static void convert(List&lt;Lead&gt; leads) {
  Set&lt;String&gt; domains = new Set&lt;String&gt;();
  for (Lead l : leads) if (l.Email != null) domains.add(l.Email.substringAfter('@').toLowerCase());
  Map&lt;String, Id&gt; accByDomain = new Map&lt;String, Id&gt;();
  for (Account a : [SELECT Id, Domain__c FROM Account WHERE Domain__c IN :domains]) accByDomain.put(a.Domain__c.toLowerCase(), a.Id);
  String status = [SELECT MasterLabel FROM LeadStatus WHERE IsConverted = true LIMIT 1].MasterLabel;
  List&lt;Database.LeadConvert&gt; lcs = new List&lt;Database.LeadConvert&gt;();
  for (Lead l : leads) {
    Database.LeadConvert lc = new Database.LeadConvert();
    lc.setLeadId(l.Id);
    lc.setConvertedStatus(status);
    lc.setDoNotCreateOpportunity(true);
    Id acc = l.Email == null ? null : accByDomain.get(l.Email.substringAfter('@').toLowerCase());
    if (acc != null) lc.setAccountId(acc);
    lcs.add(lc);
  }
  for (Database.LeadConvertResult r : Database.convertLead(lcs, false)) {
    if (!r.isSuccess()) System.debug(r.getErrors()[0].getMessage());
  }
}</code></pre>
<p><code>convertLead</code> accepts up to 100 LeadConvert objects per call.</p>`],
["sales-102","Mid","concept",`How does Opportunity Probability and Forecast Category relate to Stage?`,
`<p>Each Opportunity stage (in Sales Processes) has a default Probability and Forecast Category. Changing Stage sets them automatically; users can override Probability (unless restricted). Forecast Category drives Collaborative Forecast rollups (Pipeline, Best Case, Commit, Closed, Omitted). Code that sets Stage should not hard-code probability; read <code>OpportunityStage</code> records.</p>`],
["sales-103","Senior","scenario",`Sales wants an auto-renewal Opportunity created 90 days before a contract ends, with the same products. Design it.`,
`<ul><li>Scheduled path on Contract (90 days before EndDate) or a daily Batch selecting contracts ending in 90 days without a renewal (<code>Renewal_Opportunity__c = null</code>).</li>
<li>Create Opportunity (type Renewal, CloseDate = EndDate, owner = account owner), copy line items from the original won Opportunity using the same Pricebook; apply uplift % from Custom Metadata.</li>
<li>Link back on Contract to make it idempotent.</li>
<li>Notify owner via Custom Notification; report on renewal pipeline.</li>
<li>If CPQ (Revenue Cloud) is used, use its renewal automation instead.</li></ul>`],
["sales-104","Mid","concept",`What are Opportunity Contact Roles and why do they matter for code?`,
`<p>Junction between Opportunity and Contact with Role and IsPrimary. Used for attribution and campaign influence. They now support triggers and validation rules (an OpportunityContactRole object with full automation). Common requirement: require a primary contact role before Closed Won — implement with a before-update trigger on Opportunity querying OCRs, since validation rules can't count child records.</p>`],
["sales-105","Senior","concept",`How do Quotes sync with Opportunities and what are the coding pitfalls?`,
`<p>One Quote per Opportunity can be synced (<code>Opportunity.SyncedQuoteId</code>); line items sync both ways while synced. Pitfalls: updating OLIs on a synced opportunity also updates QuoteLineItems (and triggers on both), custom fields need Quote Line ↔ Opp Product field mapping via synced fields setup (or code), and deleting a synced quote stops sync. Avoid custom triggers fighting the sync.</p>`],
["sales-106","Mid","concept",`How do you implement a "Primary Campaign Source" and campaign influence?`,
`<p><code>Opportunity.CampaignId</code> is the primary campaign source, often set from the Lead's most recent campaign on conversion. Customizable Campaign Influence models distribute revenue across campaigns linked to contact roles (first touch, last touch, even distribution, custom models via Apex/flows).</p>`],
["sales-107","Senior","code",`Prevent closing an Opportunity as Won unless it has at least one product and a primary contact role.`,
`<pre><code>// before update on Opportunity
Set&lt;Id&gt; closing = new Set&lt;Id&gt;();
for (Opportunity o : newList) if (o.StageName == 'Closed Won' &amp;&amp; oldMap.get(o.Id).StageName != 'Closed Won') closing.add(o.Id);
if (closing.isEmpty()) return;
Map&lt;Id, Opportunity&gt; data = new Map&lt;Id, Opportunity&gt;([SELECT Id,
  (SELECT Id FROM OpportunityLineItems LIMIT 1),
  (SELECT Id FROM OpportunityContactRoles WHERE IsPrimary = true LIMIT 1)
  FROM Opportunity WHERE Id IN :closing]);
for (Opportunity o : newList) {
  if (!closing.contains(o.Id)) continue;
  Opportunity d = data.get(o.Id);
  if (d.OpportunityLineItems.isEmpty()) o.addError('Add at least one product before Closed Won.');
  else if (d.OpportunityContactRoles.isEmpty()) o.addError('Set a primary contact role before Closed Won.');
}</code></pre>
<p><code>HasOpportunityLineItem</code> is also available as a field and can be used in a validation rule for the product part.</p>`],
["sales-108","Mid","concept",`What is Sales Engagement (Cadences) and Einstein Activity Capture from a developer's viewpoint?`,
`<p>Sales Engagement provides cadences (sequences of calls/emails/tasks) and work queues; developers may need to add targets to cadences via invocable actions or APIs. Einstein Activity Capture syncs emails/events from Gmail/Outlook; captured emails are stored outside standard Task/Event objects (not queryable via normal SOQL in older setups), which affects reporting and triggers.</p>`],
["sales-109","Senior","design",`Design lead routing: by country and product interest, round-robin within a team, with working-hours awareness.`,
`<ul><li>Custom Metadata: routing rules (country, product → team/queue).</li>
<li>Team members in a custom object with active flag, capacity, last-assigned timestamp, and BusinessHours Id.</li>
<li>Before-insert/after-insert service picks team, filters members within working hours (<code>BusinessHours.isWithin</code>), selects the least recently assigned using <code>FOR UPDATE</code> on member records.</li>
<li>Fallback queue when nobody is available; SLA timer for first touch.</li>
<li>Or use Omni-Channel for Leads with skills-based routing for less code.</li></ul>`],
["sales-110","Mid","concept",`How do Opportunity Splits interact with Apex and what validations exist?`,
`<p>Splits are records in <code>OpportunitySplit</code> with SplitTypeId, SplitOwnerId, SplitPercentage. Revenue split types must total 100% per opportunity; the opportunity owner gets 100% by default. Changing owner can reassign splits. Apex can insert/update splits but must keep totals valid in one DML batch.</p>`]
]);
