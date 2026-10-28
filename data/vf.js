SF.add("vf", [
["vf-101","Senior","output",`A controller has <code>public List&lt;Account&gt; accounts {get;set;}</code> with 5,000 records and a button that re-renders a panel. Users get "Maximum view state size limit (170KB) exceeded". Fix it without losing functionality.`,
`<ul><li>Mark the list <code>transient</code> and re-query in the getter when needed, or keep only Ids in view state.</li>
<li>Paginate with <code>ApexPages.StandardSetController</code> (page size 50) so only the current page is held.</li>
<li>Select only displayed fields.</li>
<li>Move read-only data loading to JavaScript Remoting (stateless).</li></ul>
<p>Check the View State tab in the development footer to see which variables are largest.</p>`],
["vf-102","Mid","concept",`What is the order of execution on a Visualforce postback?`,
`<p>1) View state decoded and controller state restored; 2) expressions evaluated and setter methods called with submitted values; 3) the action method runs; 4) the page (or rerender target) is re-rendered, calling getters; 5) view state re-encoded. On the initial GET request, the constructor runs and getters are evaluated (no setters). Knowing this explains why a getter with a SOQL query can run several times per request — cache it in a field.</p>`],
["vf-103","Senior","scenario",`A Visualforce PDF of an invoice must be generated automatically when an Opportunity is Closed Won and attached as a file. How?`,
`<ul><li>Trigger (after update, status transition) enqueues a Queueable with the Opportunity Ids — <code>getContentAsPDF()</code> isn't allowed in triggers.</li>
<li>In the Queueable: <code>PageReference p = Page.InvoicePdf; p.getParameters().put('id', oppId); Blob pdf = p.getContentAsPDF();</code></li>
<li>Insert <code>ContentVersion</code> (Title, PathOnClient 'Invoice.pdf', VersionData = pdf, FirstPublishLocationId = oppId).</li>
<li>Each <code>getContent</code> counts as a callout; batch accordingly (100 per transaction max).</li></ul>`]
]);
