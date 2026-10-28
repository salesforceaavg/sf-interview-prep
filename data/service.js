SF.add("service", [
["service-101","Senior","code",`Write a custom InboundEmailHandler that creates a Case from an email, matches the Contact by email, and attaches files.`,
`<pre><code>global class SupportEmailHandler implements Messaging.InboundEmailHandler {
  global Messaging.InboundEmailResult handleInboundEmail(Messaging.InboundEmail email, Messaging.InboundEnvelope env) {
    Messaging.InboundEmailResult res = new Messaging.InboundEmailResult();
    List&lt;Contact&gt; cons = [SELECT Id, AccountId FROM Contact WHERE Email = :email.fromAddress LIMIT 1];
    Case c = new Case(Subject = email.subject, Description = email.plainTextBody, Origin = 'Email',
      SuppliedEmail = email.fromAddress);
    if (!cons.isEmpty()) { c.ContactId = cons[0].Id; c.AccountId = cons[0].AccountId; }
    insert c;
    List&lt;ContentVersion&gt; files = new List&lt;ContentVersion&gt;();
    if (email.binaryAttachments != null) for (Messaging.InboundEmail.BinaryAttachment a : email.binaryAttachments) {
      files.add(new ContentVersion(Title = a.fileName, PathOnClient = a.fileName, VersionData = a.body, FirstPublishLocationId = c.Id));
    }
    insert files;
    res.success = true;
    return res;
  }
}</code></pre>
<p>Expose via an Email Service address. Email-to-Case is usually preferred; a custom handler is for special parsing (structured emails from systems).</p>`],
["service-102","Senior","concept",`How does Omni-Channel capacity work and what happens when an agent declines or ignores work?`,
`<p>Each channel has a size (units or percentage); an agent's presence configuration sets total capacity. Work is routed only if it fits remaining capacity. Declines (if allowed) and push timeouts send the work back to the queue for the next agent; the presence status can change to "away" after timeout. Tracking: <code>AgentWork</code> records (status Assigned, Opened, Declined, Closed), useful for reporting and Apex-based routing.</p>`],
["service-103","Mid","concept",`What are Macros and Quick Text, and when would you build an LWC instead?`,
`<p>Macros automate repetitive console actions (select a template, update fields, send email) — bulk macros can run on multiple records. Quick Text inserts canned text. Build an LWC when the action needs logic, external data or validation beyond simple steps.</p>`],
["service-104","Senior","scenario",`Cases are being reopened by customer replies weeks after closure. Business wants replies after 14 days to create a new Case linked to the old one. How?`,
`<ul><li>Email-to-Case attaches replies (via threading token) to the closed case and may reopen it via a trigger/flow on EmailMessage.</li>
<li>Trigger on <code>EmailMessage</code> (after insert, Incoming = true, ParentId is a Case): if the case is Closed and ClosedDate &lt; today − 14, create a new Case (copy contact, account, subject "Re:"), set ParentId to the old case, and move the EmailMessage (re-create it on the new case since ParentId can't always be updated).</li>
<li>Send auto-response with the new case number.</li></ul>`],
["service-105","Mid","concept",`What is the Case Feed and the Case Email composer customization?`,
`<p>Case Feed shows emails, posts, calls in a timeline; the email action can be configured with default templates, from addresses and fields. Use <code>QuickAction.QuickActionDefaultsHandler</code> Apex to set dynamic defaults (e.g. pick template based on case language and add BCC).</p>`],
["service-106","Senior","design",`Design a case deflection and self-service strategy using Experience Cloud and Knowledge.`,
`<ul><li>Experience Cloud help center with Knowledge articles by data category; guest access for public articles.</li>
<li>Contact Support form that searches articles as the user types (deflection), tracking deflections in a custom object.</li>
<li>Einstein Bots / Agentforce service agent answering from Knowledge, escalating to Messaging with an agent.</li>
<li>Authenticated portal for case status, reducing "status update" calls.</li>
<li>Reports: deflection rate, article helpfulness, case volume trend.</li></ul>`],
["service-107","Mid","concept",`What is Messaging for In-App and Web (MIAW) vs legacy Chat?`,
`<p>Legacy Live Agent Chat is being retired; MIAW is the replacement: asynchronous persistent conversations, rich messages, bot integration, Omni-Channel routing, conversation history in <code>MessagingSession</code>. Developers customise pre-chat via hidden fields and Omni-Channel Flows to route by those values.</p>`],
["service-108","Senior","concept",`How do Entitlements and Milestones work with Apex?`,
`<ul><li>Case gets <code>EntitlementId</code> (via Entitlement assignment logic, often a trigger matching the account's active entitlement).</li>
<li>Milestones create <code>CaseMilestone</code> records with TargetDate; complete them by setting <code>CompletionDate</code> when criteria are met (e.g. first agent email sent → complete "First Response").</li>
<li>Business hours and pause (stop the clock) via <code>Case.IsStopped</code>.</li></ul>
<pre><code>List&lt;CaseMilestone&gt; ms = [SELECT Id FROM CaseMilestone WHERE CaseId IN :caseIds
  AND MilestoneType.Name = 'First Response' AND CompletionDate = null];
for (CaseMilestone m : ms) m.CompletionDate = System.now();
update ms;</code></pre>`],
["service-109","Mid","concept",`What are Case Assignment Rules and how do you trigger them from Apex?`,
`<p>Rules evaluate criteria and assign owner (user/queue) on create (and edit if chosen). From Apex, rules don't run by default; set <code>Database.DMLOptions.assignmentRuleHeader.useDefaultRule = true</code> (or <code>assignmentRuleId</code>) on the records via <code>setOptions</code> or pass to DML.</p>`],
["service-110","Senior","scenario",`Agents complain the Case record page in the Service Console is slow and tabs keep reloading. Where do you look?`,
`<ul><li>Number of components on the page; heavy related lists (Emails with large bodies, Case History); use related list quick links and tabs.</li>
<li>Custom LWCs calling Apex on every tab focus; use <code>lightning/platformWorkspaceApi</code> refresh events wisely and cacheable calls.</li>
<li>Console settings: tab limits, utility items loading on startup (Omni, History, Softphone).</li>
<li>Browser memory with many tabs; recommend tab limits.</li>
<li>Network: CTI/softphone iframes.</li></ul>`]
]);
