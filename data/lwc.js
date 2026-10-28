SF.add("lwc", [
["lwc-101","Senior","output",`A getter <code>get total() { return this.items.reduce(...) }</code> doesn't update after <code>this.items[0].qty = 5</code>. Why, and two ways to fix it?`,
`<p>Reactivity tracks <b>field reassignment</b>. Mutating a property of an object inside an array isn't observed unless the field is decorated with <code>@track</code>, so the template (and getter) doesn't re-render.</p>
<pre><code>// Fix 1: immutable update
this.items = this.items.map((it, i) =&gt; i === 0 ? { ...it, qty: 5 } : it);
// Fix 2: deep tracking
@track items = [];</code></pre>
<p>Also note: data received from <code>@wire</code> is frozen (read-only); you must copy it before mutating, otherwise you get "Cannot assign to read only property".</p>`],
["lwc-102","Senior","concept",`How does @wire decide when to re-fetch, and why might a wire not fire at all?`,
`<ul><li>It provisions when the component connects and whenever a <b>reactive parameter</b> (prefixed with <code>$</code>) changes value.</li>
<li>If any reactive parameter is <code>undefined</code>, the wire <b>doesn't call</b> the adapter (common with <code>$recordId</code> on non-record pages).</li>
<li>Objects passed as params are compared by reference; mutating a nested property doesn't trigger a re-fetch — reassign the object.</li>
<li>Cached results (cacheable Apex/LDS) may return without a server trip; use <code>refreshApex</code> when you need fresh data.</li></ul>`],
["lwc-103","Mid","concept",`Wire to a property vs wire to a function — when do you use each?`,
`<ul><li><b>Property</b>: <code>@wire(getX, {...}) result;</code> template reads <code>result.data</code>/<code>result.error</code>. Simple display.</li>
<li><b>Function</b>: <code>@wire(getX, {...}) wired({ data, error }) {...}</code> when you need to transform data, set multiple fields, keep the provisioned value for <code>refreshApex</code>, or handle errors with logic.</li></ul>
<p>For <code>refreshApex</code>, keep the whole provisioned object (not just <code>data</code>).</p>`],
["lwc-104","Senior","design",`Design an editable LWC grid of Opportunity Line Items with inline edit, validation and a single save.`,
`<ul><li><code>lightning-datatable</code> with <code>editable</code> columns, <code>draft-values</code>, <code>onsave</code>, <code>oncellchange</code> for live validation.</li>
<li>Client-side validation: build an <code>errors</code> object with <code>rows</code> and <code>table</code> keys to show red cells.</li>
<li>Save: call one Apex method with all drafts; inside, a savepoint + <code>update as user</code> with <code>Database.update(list, false)</code>; map row errors back by Id.</li>
<li>After save: clear drafts, <code>refreshApex</code>, and <code>notifyRecordUpdateAvailable</code> for the parent Opportunity so its Amount refreshes on the page.</li>
<li>Permissions: read FLS via <code>getObjectInfo</code> to make columns editable only when <code>updateable</code>.</li></ul>`],
["lwc-105","Mid","concept",`What are getObjectInfo and getPicklistValues used for?`,
`<pre><code>import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import CASE from '@salesforce/schema/Case';
import ORIGIN from '@salesforce/schema/Case.Origin';
@wire(getObjectInfo, { objectApiName: CASE }) info;
@wire(getPicklistValues, { recordTypeId: '$info.data.defaultRecordTypeId', fieldApiName: ORIGIN }) origins;</code></pre>
<p>They read metadata respecting the user's access: field labels, updateability, record type ids, picklist values per record type, dependent picklists (<code>getPicklistValuesByRecordType</code>). No Apex needed.</p>`],
["lwc-106","Senior","concept",`How do you build a dependent picklist in LWC without Apex?`,
`<p>Use <code>getPicklistValuesByRecordType</code>; each field's values include <code>controllerValues</code> (map of controlling value → index) and each value has <code>validFor</code> (array of controlling indexes). Filter the dependent values whose <code>validFor</code> includes the selected controller index. This respects record-type-specific values and needs no maintenance when admins change picklists.</p>`],
["lwc-107","Senior","concept",`What is the difference between light DOM and shadow DOM in LWC and when would you use light DOM?`,
`<ul><li>Shadow DOM (default): styles are encapsulated; outside CSS can't reach in; <code>this.template.querySelector</code>.</li>
<li>Light DOM (<code>static renderMode = 'light'</code>, template <code>lwc:render-mode="light"</code>): no encapsulation, global styles apply, <code>this.querySelector</code>; third-party libraries and SEO in Experience Cloud LWR sites work better.</li>
<li>Risk: style leakage and less isolation; use mainly in LWR sites and leaf components.</li></ul>`],
["lwc-108","Mid","code",`Write an LWC that debounces a search input and calls Apex imperatively.`,
`<pre><code>import { LightningElement } from 'lwc';
import search from '@salesforce/apex/ContactSearch.search';
const DELAY = 300;
export default class ContactSearch extends LightningElement {
  results = []; error; timer;
  handleKey(e) {
    const term = e.target.value;
    clearTimeout(this.timer);
    if (term.length &lt; 3) { this.results = []; return; }
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    this.timer = setTimeout(async () =&gt; {
      try { this.results = await search({ term }); this.error = undefined; }
      catch (err) { this.error = err.body ? err.body.message : err.message; }
    }, DELAY);
  }
  disconnectedCallback() { clearTimeout(this.timer); }
}</code></pre>`],
["lwc-109","Senior","concept",`How does LDS caching work and what happens when Apex updates a record that LDS has cached?`,
`<p>LDS keeps a normalised client cache shared by all components (keyed by record Id and fields). Updates made through LDS refresh all components automatically. Changes made by Apex or another user are <b>not</b> known to LDS; the UI shows stale values until the cache expires or you notify it: <code>notifyRecordUpdateAvailable([{ recordId }])</code> after the imperative Apex call (replaces deprecated <code>getRecordNotifyChange</code>). For cached Apex wires, call <code>refreshApex</code>.</p>`],
["lwc-110","Mid","concept",`How do you expose a public method on a child and call it from the parent? What are the rules?`,
`<pre><code>// child
@api reset() { this.value = ''; }
// parent
this.template.querySelector('c-child').reset();</code></pre>
<p>Only after the child is rendered (e.g. in an event handler or <code>renderedCallback</code>). Prefer data down (properties) and events up; use public methods for imperative actions like focus, reset, validate. Don't mutate <code>@api</code> properties inside the child — they're owned by the parent.</p>`],
["lwc-111","Senior","concept",`Why shouldn't a child component change its own @api property, and what's the pattern instead?`,
`<p>The parent owns @api values; changing them in the child breaks one-way data flow and is overwritten on the next parent render (and in dev mode throws a warning). Pattern: copy into a private field in a setter, edit the private copy, and dispatch an event with the new value for the parent to update its state.</p>
<pre><code>_value;
@api get value() { return this._value; }
set value(v) { this._value = v; }</code></pre>`],
["lwc-112","Mid","concept",`How do you validate a form with lightning-input fields before saving?`,
`<pre><code>const ok = [...this.template.querySelectorAll('lightning-input, lightning-combobox')]
  .reduce((valid, el) =&gt; { el.reportValidity(); return valid &amp;&amp; el.checkValidity(); }, true);
if (!ok) return;</code></pre>
<p>Use <code>required</code>, <code>pattern</code>, <code>min/max</code> attributes and <code>setCustomValidity('message')</code> for custom rules (call it with '' to clear). <code>lightning-record-edit-form</code> also runs server-side validation rules and shows <code>lightning-messages</code>.</p>`],
["lwc-113","Senior","code",`Write a reusable LWC "record picker" that searches any object and emits the selected Id.`,
`<pre><code>// recordPicker.js
import { LightningElement, api } from 'lwc';
import find from '@salesforce/apex/RecordPickerCtrl.find';
export default class RecordPicker extends LightningElement {
  @api objectApiName = 'Account'; @api label = 'Search'; @api fieldName = 'Name';
  options = []; timer;
  handleInput(e) {
    clearTimeout(this.timer);
    const term = e.target.value;
    this.timer = setTimeout(async () =&gt; {
      this.options = term.length &lt; 2 ? [] :
        await find({ objectApiName: this.objectApiName, fieldName: this.fieldName, term });
    }, 300);
  }
  pick(e) {
    this.dispatchEvent(new CustomEvent('select', { detail: { recordId: e.currentTarget.dataset.id } }));
    this.options = [];
  }
}
// RecordPickerCtrl.cls
@AuraEnabled(cacheable=true)
public static List&lt;SObject&gt; find(String objectApiName, String fieldName, String term) {
  Schema.SObjectType t = Schema.getGlobalDescribe().get(objectApiName);
  if (t == null || !t.getDescribe().fields.getMap().containsKey(fieldName)) throw new AuraHandledException('Invalid field');
  String q = 'SELECT Id, ' + fieldName + ' FROM ' + objectApiName + ' WHERE ' + fieldName + ' LIKE :t ORDER BY ' + fieldName + ' LIMIT 10';
  return Database.queryWithBinds(q, new Map&lt;String,Object&gt;{ 't' =&gt; String.escapeSingleQuotes(term) + '%' }, AccessLevel.USER_MODE);
}</code></pre>
<p>Note the object/field whitelist via describe to prevent injection, and that the standard <code>lightning-record-picker</code> component now covers many of these needs.</p>`],
["lwc-114","Mid","concept",`What is lightning-record-picker and when would you still build a custom lookup?`,
`<p><code>lightning-record-picker</code> is a standard component that searches records of an object with filters, display fields and matching info, respecting user access. Build custom when you need multi-object search, multi-select, results from an external system, or complex Apex-driven filtering.</p>`],
["lwc-115","Senior","concept",`How do you share code between LWC components?`,
`<ul><li>Service component (a module with only a JS file): <code>import { formatCurrency } from 'c/utils';</code></li>
<li>Base classes: <code>export default class Base extends LightningElement</code> and extend it (mixins via functions).</li>
<li>Shared CSS: a CSS-only module imported with <code>@import 'c/sharedStyles';</code>.</li>
<li>Labels and constants: <code>@salesforce/label</code>, static resources for JSON config.</li></ul>`],
["lwc-116","Mid","concept",`How do you load a third-party JS library (e.g. Chart.js) in LWC?`,
`<pre><code>import { loadScript } from 'lightning/platformResourceLoader';
import CHARTJS from '@salesforce/resourceUrl/chartjs';
async renderedCallback() {
  if (this.loaded) return;
  this.loaded = true;
  await loadScript(this, CHARTJS);
  const ctx = this.template.querySelector('canvas').getContext('2d');
  this.chart = new window.Chart(ctx, this.config);
}</code></pre>
<p>Upload the library as a static resource; libraries must be compatible with Lightning Web Security; use <code>lwc:dom="manual"</code> on containers the library manipulates.</p>`],
["lwc-117","Senior","scenario",`An LWC works in Lightning Experience but not in the Salesforce mobile app or an Experience Cloud site. What do you check?`,
`<ul><li>Targets in meta.xml (<code>lightning__RecordPage</code> with <code>formFactor</code> Small, <code>lightningCommunity__Page</code>).</li>
<li>APIs not supported in that container: <code>ShowToastEvent</code> in LWR sites, <code>empApi</code>, <code>NavigationMixin</code> page types (<code>standard__recordPage</code> vs <code>comm__namedPage</code>), workspace API (console only).</li>
<li>Guest/external user access to Apex classes and objects.</li>
<li>CSS relying on SLDS classes not loaded in LWR themes.</li>
<li>Mobile offline (Briefcase) needing LDS adapters, not Apex.</li></ul>`],
["lwc-118","Mid","concept",`What's the difference between connectedCallback and renderedCallback for data loading?`,
`<p>Load data in <code>connectedCallback</code> (runs once when inserted; @api properties set by the parent are available). <code>renderedCallback</code> runs after every render — loading data there causes a render loop unless guarded. Use renderedCallback only for DOM work (third-party libraries, focusing, measuring elements).</p>`],
["lwc-119","Senior","concept",`How do you create a modal in LWC the modern way?`,
`<pre><code>// myModal.js
import LightningModal from 'lightning/modal';
export default class MyModal extends LightningModal {
  @api content;
  handleOk() { this.close('ok'); }
}
// caller
import MyModal from 'c/myModal';
const result = await MyModal.open({ size: 'small', label: 'Confirm', content: 'Close 3 cases?' });</code></pre>
<p><code>LightningModal</code> handles focus trapping, Esc, accessibility and returns a Promise with the close value. Also <code>LightningConfirm</code>, <code>LightningAlert</code>, <code>LightningPrompt</code> replace native dialogs.</p>`],
["lwc-120","Senior","concept",`How do you make an LWC accessible?`,
`<ul><li>Prefer base components (they implement ARIA).</li>
<li>Label every input; use <code>label-hidden</code> rather than no label.</li>
<li>Keyboard support: all actions reachable via Tab/Enter/Space; visible focus.</li>
<li>Use <code>aria-live</code> for dynamic messages, <code>aria-describedby</code> for errors.</li>
<li>Don't convey meaning by color alone; check contrast.</li>
<li>Test with a screen reader and the axe/Salesforce accessibility tooling.</li></ul>`],
["lwc-121","Mid","output",`In an LWC template, <code>&lt;template for:each={items} for:item="i"&gt;&lt;p&gt;{i.name}&lt;/p&gt;&lt;/template&gt;</code> logs a warning. What's missing?`,
`<p>A <code>key</code> on the first element inside the iteration: <code>&lt;p key={i.id}&gt;</code>. Keys must be unique strings/numbers, not the index, so the engine can re-render efficiently. You also can't use expressions like <code>{i.price * 2}</code> in templates — use a getter or precomputed field.</p>`],
["lwc-122","Senior","concept",`What is the difference between lwc:if/lwc:elseif and the old if:true, and why does it matter?`,
`<p><code>lwc:if</code>, <code>lwc:elseif</code>, <code>lwc:else</code> evaluate the condition once per render and support else branches, improving performance and readability. <code>if:true/if:false</code> are deprecated and may be removed. Conditional rendering destroys and recreates children, so component state inside the branch is lost when hidden — use CSS (<code>class</code> toggle) when state must be kept.</p>`],
["lwc-123","Senior","concept",`How do you call an Apex method that takes a complex object from LWC?`,
`<pre><code>// Apex
public class OrderInput { @AuraEnabled public Id accountId; @AuraEnabled public List&lt;LineInput&gt; lines; }
public class LineInput { @AuraEnabled public Id productId; @AuraEnabled public Decimal qty; }
@AuraEnabled public static Id createOrder(OrderInput input) { ... }
// JS
await createOrder({ input: { accountId: this.recordId, lines: this.lines.map(l =&gt; ({ productId: l.id, qty: l.qty })) } });</code></pre>
<p>Inner class properties need <code>@AuraEnabled</code> and a public no-arg constructor; the JSON keys must match property names exactly. Alternative: pass a JSON string and <code>JSON.deserialize</code>.</p>`],
["lwc-124","Mid","concept",`How do you use custom labels and static resources in LWC, and why does it matter for multi-language orgs?`,
`<pre><code>import GREETING from '@salesforce/label/c.Welcome_Message';
import LOGO from '@salesforce/resourceUrl/company_logo';</code></pre>
<p>Custom labels are translated via Translation Workbench, so components display in the user's language without code changes. Hard-coded strings in JS/HTML can't be translated.</p>`],
["lwc-125","Senior","scenario",`A record page with 8 custom LWCs loads slowly. Each calls its own Apex method for Account data. How do you improve it?`,
`<ul><li>Replace Apex reads with LDS <code>getRecord</code>: LDS deduplicates and shares one request and cache.</li>
<li>Where Apex is needed, make it <code>cacheable=true</code> and combine calls into one method returning a DTO, provided via a parent container component or LMS.</li>
<li>Move secondary components into tabs/accordions (lazy rendered).</li>
<li>Check for render loops in renderedCallback and heavy getters.</li>
<li>Measure with Lightning Usage (EPT) and Chrome performance profile before and after.</li></ul>`]
]);
