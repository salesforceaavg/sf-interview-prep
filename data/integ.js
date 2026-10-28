SF.add("integ", [
["integ-101","Senior","design",`An external website must create Leads in Salesforce in real time (5,000/day). Compare Web-to-Lead, REST API with a Connected App, and a custom Apex REST endpoint.`,
`<div class="tbl"><table><tr><th>Option</th><th>Pros</th><th>Cons</th></tr>
<tr><td>Web-to-Lead</td><td>No code, no auth</td><td>500/day limit, no response with Lead Id, spam risk, limited validation</td></tr>
<tr><td>REST sObject API</td><td>Standard, returns Id, bulk via Composite</td><td>Website needs OAuth (Client Credentials/JWT), field mapping on the website side</td></tr>
<tr><td>Apex REST</td><td>Custom validation, dedupe, assignment in one call, stable contract</td><td>Code + tests to maintain</td></tr></table></div>
<p>5,000/day exceeds Web-to-Lead. Typical answer: Apex REST (or REST API) via a backend (never from browser JS with credentials), Client Credentials flow with an integration user, reCAPTCHA on the form, duplicate rules, assignment rules via <code>Database.DMLOptions</code>.</p>`],
["integ-102","Senior","concept",`Explain the JWT Bearer flow step by step.`,
`<ol><li>Create a Connected App / External Client App with "Use digital signatures" and upload the X.509 certificate; pre-authorize users via profile/permission set.</li>
<li>Client builds a JWT: <code>iss</code> = consumer key, <code>sub</code> = Salesforce username, <code>aud</code> = login URL (login/test.salesforce.com or My Domain), <code>exp</code> = short expiry.</li>
<li>Signs it with the private key (RS256).</li>
<li>POSTs to <code>/services/oauth2/token</code> with <code>grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer</code>.</li>
<li>Receives an access token (no refresh token); repeats when expired.</li></ol>
<p>No password or user interaction; private key stays on the server; ideal for CI/CD and middleware.</p>`],
["integ-103","Senior","concept",`How do you call a Salesforce org from another Salesforce org?`,
`<ul><li>Auth Provider of type Salesforce + Named Credential (Per User or Named Principal) in org A pointing to org B's Connected App.</li>
<li>Callouts: <code>callout:OrgB/services/data/v61.0/query?q=...</code> or Apex REST in org B.</li>
<li>For real-time reading without copying: Salesforce Connect cross-org adapter.</li>
<li>For events: org B subscribes via Pub/Sub API from middleware, or Platform Events relayed.</li></ul>`],
["integ-104","Mid","code",`Write an Apex REST endpoint that accepts a list of orders, upserts them by external id, and returns per-record results.`,
`<pre><code>@RestResource(urlMapping='/v1/orders')
global with sharing class OrdersApi {
  global class OrderDto { public String externalId; public String accountExtId; public Decimal amount; }
  global class Result { public String externalId; public Boolean success; public String id; public String error; }

  @HttpPost
  global static List&lt;Result&gt; upsertOrders() {
    List&lt;OrderDto&gt; input = (List&lt;OrderDto&gt;) JSON.deserialize(
      RestContext.request.requestBody.toString(), List&lt;OrderDto&gt;.class);
    List&lt;Order__c&gt; recs = new List&lt;Order__c&gt;();
    for (OrderDto d : input) recs.add(new Order__c(External_Id__c = d.externalId, Amount__c = d.amount,
      Account__r = new Account(ERP_Id__c = d.accountExtId)));
    Database.UpsertResult[] res = Database.upsert(recs, Order__c.External_Id__c, false, AccessLevel.USER_MODE);
    List&lt;Result&gt; out = new List&lt;Result&gt;();
    for (Integer i = 0; i &lt; res.size(); i++) {
      Result r = new Result(); r.externalId = input[i].externalId; r.success = res[i].isSuccess();
      if (r.success) r.id = res[i].getId(); else r.error = res[i].getErrors()[0].getMessage();
      out.add(r);
    }
    RestContext.response.statusCode = 200;
    return out;
  }
}</code></pre>
<p>Partial success with per-record results is friendlier for callers than all-or-nothing. Limit input size (e.g. 200) and return 400 for bigger payloads.</p>`],
["integ-105","Senior","concept",`What HTTP status codes and error format should a custom Apex REST API return?`,
`<ul><li>200/201 success, 204 no content; 400 validation/malformed JSON; 401/403 handled by platform for auth; 404 not found; 409 conflict (duplicate); 500 unexpected.</li>
<li>Set <code>RestContext.response.statusCode</code> and a consistent JSON body: <code>{ "errorCode": "INVALID_AMOUNT", "message": "...", "field": "amount" }</code>.</li>
<li>Don't leak stack traces; log details server side with a correlation id returned in the response.</li>
<li>Version the URL (<code>/v1/</code>) to evolve without breaking clients.</li></ul>`],
["integ-106","Senior","scenario",`Callouts to an external API intermittently fail with "Read timed out" during business hours. How do you handle it?`,
`<ul><li>Confirm timeout setting (<code>req.setTimeout</code>, default 10 s, max 120 s) vs API response times.</li>
<li>Move the call out of the synchronous user transaction (Queueable) so users don't wait and to avoid the long-running request limit.</li>
<li>Retry with exponential backoff for timeouts and 5xx; ensure the API call is idempotent (send an idempotency key) since a timeout may have succeeded on the server.</li>
<li>Circuit breaker: after N failures in a window (tracked in Platform Cache or a record), stop calling for a few minutes.</li>
<li>Coordinate with the API team: rate limits, regional latency, payload size.</li></ul>`],
["integ-107","Mid","concept",`What is Platform Cache and how does it help integrations?`,
`<p>A key-value cache in memory: <b>Org cache</b> (shared across users) and <b>Session cache</b> (per user session). Use it to store OAuth tokens for non-Named-Credential APIs, reference data from external systems (exchange rates), or circuit-breaker state, avoiding repeated callouts and SOQL. Implement <code>Cache.CacheBuilder</code> for automatic load-on-miss. Values can be evicted anytime, so always handle misses.</p>
<pre><code>Decimal rate = (Decimal) Cache.Org.get('local.FX.USDINR');
if (rate == null) { rate = FxService.fetch('USD','INR'); Cache.Org.put('local.FX.USDINR', rate, 3600); }</code></pre>`],
["integ-108","Senior","concept",`Compare Pub/Sub API, Streaming API (CometD) and Outbound Messages for pushing data out of Salesforce.`,
`<ul><li><b>Pub/Sub API</b> (gRPC, HTTP/2): subscribe and publish Platform Events and CDC, efficient binary (Avro) payloads, flow control, managed subscriptions; the modern choice.</li>
<li><b>Streaming API (CometD)</b>: older long-polling; PushTopics/Generic Streaming are legacy; still used by empApi in LWC.</li>
<li><b>Outbound Messages</b>: declarative SOAP push with retries for 24 h; simple but SOAP-only, limited payload.</li></ul>
<p>Events are retained 72 hours; subscribers use replay ids to catch up.</p>`],
["integ-109","Senior","design",`Design a bi-directional sync of Accounts between Salesforce and an ERP where both can edit. How do you avoid loops and conflicts?`,
`<ul><li><b>System of record per field</b>: e.g. credit limit owned by ERP, sales fields owned by Salesforce. Reduces conflicts dramatically.</li>
<li><b>Loop prevention</b>: the integration user's updates don't trigger outbound sync (check <code>UserInfo.getUserId()</code> or a "Last_Updated_By_Integration__c" flag / CDC <code>commitUser</code>).</li>
<li><b>Conflict resolution</b>: compare timestamps/version numbers; last writer wins per field or route to a manual queue.</li>
<li><b>Keys</b>: ERP id in Salesforce External Id field and Salesforce Id stored in ERP.</li>
<li><b>Transport</b>: CDC out via middleware, upserts in via Composite/Bulk API.</li>
<li>Reconciliation job nightly comparing hashes of key fields.</li></ul>`],
["integ-110","Mid","concept",`What is the Composite API and when do you use the different flavours?`,
`<ul><li><b>Composite</b>: up to 25 subrequests in order; later requests reference earlier results (<code>@{refAccount.id}</code>); optional allOrNone.</li>
<li><b>Composite Graph</b>: multiple graphs, up to 500 nodes per graph, each graph all-or-nothing; good for complex related inserts.</li>
<li><b>sObject Collections</b>: up to 200 records of possibly different types in one call (create/update/upsert/delete).</li>
<li><b>Composite Batch</b>: up to 25 independent subrequests, no references between them.</li>
<li><b>sObject Tree</b>: insert record trees (parent with children) up to 200 records.</li></ul>`],
["integ-111","Senior","concept",`How do you secure inbound API access to Salesforce for a third-party system?`,
`<ul><li>Dedicated integration user (Salesforce Integration license), API Only permission, minimal permission sets.</li>
<li>External Client App / Connected App with admin-approved users, OAuth scopes limited to <code>api</code> (no <code>full</code>/<code>refresh_token</code> unless needed), IP restrictions or "Enforce IP restrictions".</li>
<li>Certificate-based flows (JWT) or Client Credentials; never username/password.</li>
<li>Custom REST endpoints: <code>with sharing</code>, user mode, input validation, size limits.</li>
<li>Monitor via Event Monitoring (API Total Usage) and Login History.</li></ul>`],
["integ-112","Mid","code",`Write an HttpCalloutMock that returns different responses per endpoint and simulates a failure.`,
`<pre><code>@isTest
public class RoutingMock implements HttpCalloutMock {
  Map&lt;String, HttpResponse&gt; byPath = new Map&lt;String, HttpResponse&gt;();
  public RoutingMock add(String path, Integer code, String body) {
    HttpResponse r = new HttpResponse(); r.setStatusCode(code); r.setBody(body);
    byPath.put(path, r); return this;
  }
  public HttpResponse respond(HttpRequest req) {
    for (String p : byPath.keySet()) if (req.getEndpoint().contains(p)) return byPath.get(p);
    CalloutException e = new CalloutException(); e.setMessage('Read timed out'); throw e;
  }
}
// usage
Test.setMock(HttpCalloutMock.class, new RoutingMock()
  .add('/token', 200, '{"access_token":"x"}')
  .add('/orders', 503, '{"error":"busy"}'));</code></pre>`],
["integ-113","Senior","concept",`What are External Services and when would you use them instead of Apex callouts?`,
`<p>External Services import an OpenAPI 2.0/3.0 spec and generate invocable actions usable in Flow (and Apex) with typed inputs/outputs, using a Named Credential for auth. Use for simple request/response integrations that admins orchestrate in Flow. Use Apex when you need complex transformation, error handling, retries, bulk processing or non-OpenAPI services.</p>`],
["integ-114","Senior","scenario",`A partner wants to receive a webhook every time an Opportunity is Closed Won. Design it so failures don't affect sales users.`,
`<ul><li>Record-triggered flow or trigger publishes <code>Deal_Won__e</code> (publish after commit).</li>
<li>Event subscriber (Apex trigger or Flow) creates an <code>Outbound_Webhook__c</code> request record.</li>
<li>Queueable dispatcher posts to the partner via Named Credential with HMAC signature header for authenticity, retries with backoff, marks status.</li>
<li>Alternatively Event Relay to AWS EventBridge, letting AWS handle delivery.</li>
<li>Sales users' save never waits for or fails due to the partner.</li></ul>`],
["integ-115","Mid","concept",`What is the difference between a Connected App and an External Client App?`,
`<p>External Client Apps are the newer framework for OAuth integrations: settings and policies are split (developer-owned settings vs admin-owned policies), metadata is packageable cleanly, and they're "closed by default" (not available outside their org unless distributed). Connected Apps are the older model; new integrations are encouraged to use External Client Apps where supported.</p>`],
["integ-116","Senior","concept",`How do you send large files (100 MB) from Salesforce to an external system?`,
`<p>Apex can't: heap limit is 6/12 MB and callout body max 6/12 MB. Options: the external system pulls the file through REST (<code>/sobjects/ContentVersion/{id}/VersionData</code>) streaming the binary; or use middleware triggered by an event; or generate a public link (<code>ContentDistribution</code>) with expiry and send only the URL. Salesforce Files Connect for external storage.</p>`],
["integ-117","Mid","concept",`How do you handle API versioning and deprecations in integrations?`,
`<ul><li>Pin each integration to an explicit API version in the URL.</li>
<li>Track Salesforce API retirement announcements (older versions 21.0–30.0 were retired) and plan upgrades.</li>
<li>Apex classes have their own API version in meta.xml; update deliberately, since behaviour can change between versions.</li>
<li>For your own Apex REST APIs, version the URL mapping and keep the old version until clients migrate.</li></ul>`],
["integ-118","Senior","concept",`What is Event Relay and when would you use it?`,
`<p>Event Relay sends Platform Events and Change Data Capture events from Salesforce directly to Amazon EventBridge without middleware, with replay and error handling configured in Setup. Use when your downstream consumers live in AWS (Lambda, SQS, Step Functions). Inbound from AWS to Salesforce uses EventBridge API destinations calling Salesforce APIs.</p>`],
["integ-119","Mid","output",`This code makes a callout after updating a record and fails. What's the error and fix?<pre><code>update acc;
HttpResponse r = new Http().send(req);</code></pre>`,
`<p><code>System.CalloutException: You have uncommitted work pending. Please commit or rollback before calling out</code>. Fix by reordering (callout first, then DML), or moving the callout into a Queueable/<code>@future(callout=true)</code> enqueued after the DML. Savepoint + rollback before the callout also clears the pending work, but you lose the update.</p>`],
["integ-120","Senior","design",`What would you put in an integration design document for a Salesforce project?`,
`<ul><li>Systems, data objects, direction and system of record per field.</li>
<li>Pattern per flow (request-reply, fire-and-forget, batch, CDC), triggers and frequency, volumes and peaks.</li>
<li>API choice and limits impact (daily API calls, async limits).</li>
<li>Auth method, integration users, certificates rotation.</li>
<li>Error handling, retries, dead-letter, alerting, reprocessing UI.</li>
<li>Idempotency and ordering, keys/External Ids.</li>
<li>Security (PII, encryption, logging masks), monitoring dashboards, runbooks.</li>
<li>Test strategy with mocks and sandbox endpoints.</li></ul>`]
]);
