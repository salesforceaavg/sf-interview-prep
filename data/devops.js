SF.add("devops", [
["devops-101","Mid","concept",`What are the key Salesforce CLI (sf) commands you use daily?`,
`<pre><code>sf org login web --alias dev --set-default
sf project retrieve start --metadata ApexClass:OrderService
sf project deploy start --source-dir force-app --target-org qa --test-level RunLocalTests
sf project deploy start --dry-run ...          # validate only
sf project deploy quick --job-id 0Af...         # quick deploy a validated job
sf apex run test --class-names OrderServiceTest --result-format human --code-coverage
sf apex run --file scripts/seed.apex
sf org create scratch --definition-file config/project-scratch-def.json --alias feature1</code></pre>`],
["devops-102","Senior","concept",`Org-based development vs package-based (unlocked packages): trade-offs?`,
`<ul><li><b>Org-based</b>: deploy metadata from source to orgs; simple to start; the org is the source of truth over time; dependencies are implicit.</li>
<li><b>Unlocked packages</b>: modules with versions and explicit dependencies; installable and upgradable; clean boundaries; better for large teams. Costs: package design, dependency management, longer build times, some metadata unsupported.</li></ul>
<p>Many teams start org-based with Git and move core domains into unlocked packages as the codebase grows.</p>`],
["devops-103","Senior","design",`Describe a CI/CD pipeline for Salesforce using GitHub Actions.`,
`<ol><li>Developer works in a scratch org/dev sandbox, commits to a feature branch.</li>
<li>Pull request triggers: authenticate with JWT (secret key in GitHub secrets), run Code Analyzer (PMD/ESLint), run LWC Jest tests, validate deployment of the delta (sfdx-git-delta) to an integration sandbox with RunLocalTests or RunRelevantTests.</li>
<li>Merge to <code>develop</code> deploys to QA; <code>release/*</code> to UAT.</li>
<li>Merge to <code>main</code>: validate against production earlier, then quick deploy in the release window.</li>
<li>Post-deploy steps automated (permission set assignments, data seeding) and notifications to Slack.</li></ol>`],
["devops-104","Mid","concept",`How do you deploy destructive changes (deleting a field or class)?`,
`<p>Create <code>destructiveChanges.xml</code> (or <code>destructiveChangesPre/Post.xml</code>) listing components, alongside a <code>package.xml</code>, and deploy with the manifest. Pre runs before additions, Post after. Remove all references first (code, flows, layouts, reports). In CLI, <code>sf project deploy start --manifest package.xml --post-destructive-changes destructiveChangesPost.xml</code>. Deleted fields stay in the recycle bin 15 days (can't reuse the API name until erased).</p>`],
["devops-105","Senior","scenario",`A deployment fails because a profile references a field that doesn't exist in production. How do you avoid profile deployment pain?`,
`<ul><li>Stop deploying profiles; manage access with permission sets and permission set groups (source-friendly, additive).</li>
<li>Keep profiles minimal (login, layouts, defaults) and deploy them rarely and carefully.</li>
<li>Retrieve profiles together with the referenced components to get correct partial XML.</li>
<li>Salesforce's direction: user permissions on profiles are being phased toward permission sets.</li></ul>`],
["devops-106","Mid","concept",`What test levels can you choose when deploying to production?`,
`<ul><li><b>NoTestRun</b>: not allowed for production when Apex is deployed.</li>
<li><b>RunSpecifiedTests</b>: you list tests; each deployed class/trigger needs 75% coverage from those tests.</li>
<li><b>RunLocalTests</b>: all tests in the org except managed packages (default for production).</li>
<li><b>RunAllTestsInOrg</b>: includes managed packages.</li>
<li><b>RunRelevantTests</b>: a newer option where the platform picks tests related to the changed components. Check that it's available in your org's release before relying on it.</li></ul>`],
["devops-107","Senior","concept",`How do you handle environment-specific values (endpoints, Ids, emails) across orgs?`,
`<ul><li>Named Credentials per org (same name, different URL/credential).</li>
<li>Custom Metadata for business config; Custom Settings (hierarchy) for per-org values not deployed.</li>
<li>Never hard-code record Ids; look up by DeveloperName (queues, record types via <code>Schema.SObjectType.Case.getRecordTypeInfosByDeveloperName()</code>).</li>
<li>Use string replacements in sfdx-project.json (<code>replacements</code>) for values that must differ in metadata at deploy time.</li></ul>`],
["devops-108","Mid","concept",`What is a scratch org and when do you use it instead of a sandbox?`,
`<p>A disposable, source-driven org created from a definition file (edition, features, settings), lasting 1–30 days. Ideal for feature development and CI tests from a clean state, and for package development. Sandboxes are copies of production (metadata and maybe data) used when you need production configuration, integrations or data (UAT, performance).</p>`],
["devops-109","Senior","scenario",`Two developers changed the same Flow in different sandboxes; the second deployment overwrote the first. How do you prevent this?`,
`<ul><li>Source control as the single source of truth; every change is retrieved and committed; merge conflicts surface in Git.</li>
<li>Flows are XML and hard to merge; agree ownership per flow, keep flows small and modular (subflows).</li>
<li>Pull latest before starting; use DevOps Center or Gearset/Copado to detect drift.</li>
<li>Back-promote production hotfixes to lower environments.</li></ul>`],
["devops-110","Mid","concept",`How do you run static code analysis on Salesforce code?`,
`<p>Salesforce Code Analyzer (<code>sf code-analyzer run</code>) bundles PMD for Apex, ESLint for LWC/Aura, Graph Engine for data-flow security (CRUD/FLS), RetireJS and flow scanning. Run it in CI and fail builds on high-severity rules; customise rulesets (e.g. ApexCRUDViolation, AvoidSoqlInLoops, ApexSOQLInjection).</p>`]
]);
