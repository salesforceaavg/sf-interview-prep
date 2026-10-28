SF.add("exp", [
["exp-101","Senior","concept",`How do you get the current external user's Account and Contact in Apex and use it safely?`,
`<pre><code>User u = [SELECT ContactId, Contact.AccountId FROM User WHERE Id = :UserInfo.getUserId()];
List&lt;Case&gt; mine = [SELECT Id, Subject FROM Case WHERE AccountId = :u.Contact.AccountId WITH USER_MODE];</code></pre>
<p>Never accept AccountId from the browser for authorization; derive it server-side. Combined with <code>with sharing</code>/user mode and sharing sets, this prevents IDOR (users fetching other companies' data by changing an Id).</p>`],
["exp-102","Senior","concept",`What are the main differences in sharing between internal and external users?`,
`<ul><li>Separate External OWD (can be more restrictive than internal).</li>
<li>High-volume (Customer Community) users: no roles; access via Sharing Sets, ownership, and Share Groups.</li>
<li>Plus/Partner users: up to 3 roles per account (Executive, Manager, User), sharing rules can target them.</li>
<li>Super User access lets external managers see records of others in their account.</li>
<li>Guest users: always private, guest sharing rules read-only only.</li></ul>`],
["exp-103","Mid","concept",`How do you build a custom login or self-registration page for an Experience Cloud site?`,
`<p>Use the standard login/self-registration components or custom LWCs calling Apex that uses <code>Site.login(username, password, startUrl)</code> and <code>Site.createExternalUser(user, accountId, password)</code>, or a Self-Registration Apex handler (<code>Auth.ConfigurableSelfRegHandler</code>) to create Contact/Account and user with custom fields. Social login via Auth Providers with a registration handler.</p>`],
["exp-104","Senior","scenario",`An LWR site shows stale data to logged-in users after updates. Why?`,
`<ul><li>LWR sites publish static content and use CDN caching; dynamic data must come from Apex/UI API at runtime, not baked into published pages.</li>
<li>Cacheable Apex responses are cached in the browser; use <code>refreshApex</code> or non-cacheable calls for volatile data.</li>
<li>Changes to components or pages require republishing the site.</li>
<li>Check that no data is served from public static resources.</li></ul>`],
["exp-105","Mid","concept",`What is the Experience Cloud "Account Role" and "Account Relationships" for partners?`,
`<p>Partner and Plus users get roles beneath the account owner's role (Partner Executive/Manager/User). Account Relationships (with data sharing rules) let one partner account share records with another related account (e.g. distributor and reseller), used in channel scenarios.</p>`],
["exp-106","Senior","design",`Design a B2B customer portal where company admins manage their own users and see all orders, while regular users see only their own.`,
`<ul><li>Customer Community Plus (or Partner) licenses; roles: company admin = Manager role, others = User role.</li>
<li>Order OWD private external; owner = the portal user who placed it; managers see subordinates' orders via role hierarchy.</li>
<li>Delegated External User Administration permission for company admins (create/deactivate users of their account).</li>
<li>LWC "My Team" uses Apex <code>with sharing</code>; actions check custom permissions.</li>
<li>Audit with login history and event monitoring.</li></ul>`],
["exp-107","Mid","concept",`How do you navigate between pages in an Experience Cloud site from LWC?`,
`<pre><code>this[NavigationMixin.Navigate]({ type: 'comm__namedPage', attributes: { name: 'Order_Detail__c' }, state: { orderId: id } });
// or record page
this[NavigationMixin.Navigate]({ type: 'standard__recordPage', attributes: { recordId: id, actionName: 'view' } });</code></pre>
<p>Read state with <code>@wire(CurrentPageReference)</code>. Custom state keys need a namespace prefix like <code>c__orderId</code> in Lightning Experience; in sites plain keys work for named pages.</p>`],
["exp-108","Senior","concept",`What security checks would you run before launching a public Experience Cloud site?`,
`<ul><li>Guest User Access Report / guest profile review: minimal object and field access, no "View All", API disabled for guests.</li>
<li>Apex classes accessible to guests: audit for <code>without sharing</code> and FLS enforcement.</li>
<li>Clickjacking protection, CSP trusted sites, HTTPS, session settings.</li>
<li>Rate limiting / reCAPTCHA on forms.</li>
<li>Run Salesforce Code Analyzer and the Health Check; test with an unauthenticated browser.</li></ul>`],
["exp-109","Mid","concept",`What are Audiences and how do they help personalization?`,
`<p>Audiences define who sees a page variation or component (by profile, location, record type, user/account fields, permission). Use them to show different home pages for partners vs customers without code.</p>`],
["exp-110","Senior","scenario",`Partner users report they can't see Leads assigned to their company by the channel manager. What do you check?`,
`<ul><li>Lead owner: should be a partner user or a queue the partners belong to.</li>
<li>External OWD for Lead and sharing rules targeting partner roles/groups.</li>
<li>Partner user's profile/permission set: Read on Lead, FLS.</li>
<li>Lead list views / tabs exposed in the site navigation and visibility for the site.</li>
<li>Whether "Partner Role" level is too low to see other users' leads (need Manager/Executive or super user).</li></ul>`]
]);
