# Salesforce Developer Interview Prep

A free, static website with 530+ Salesforce developer interview questions and answers.
Anyone can read everything without an account. Visitors who sign in get their
"In review" / "Done" marks saved to their account and synced across devices.

```
index.html              page shell
assets/styles.css       design (light + dark)
assets/app.js           filters, search, rendering
assets/progress.js      progress storage: browser cache + optional Supabase sync
assets/config.js        your Supabase URL and key go here
data/*.js               questions, one file per topic
supabase/schema.sql     database table + security rules
```

No build step. No server code. It runs on any static host.

---

## 1. Run it locally (2 minutes)

Open a terminal in this folder and run either:

```bash
python -m http.server 8080        # Python 3
# or
npx serve .                       # Node
```

Open http://localhost:8080. Sign-in is hidden until you fill in `assets/config.js`;
progress is saved in your browser meanwhile.

---

## 2. Host it free on GitHub Pages (10 minutes)

1. Create a GitHub account and a new **public** repository, e.g. `sf-interview-prep`.
2. Upload all files in this folder (drag and drop on the repo page, or `git push`).
3. Repository → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
4. After about a minute your site is live at
   `https://<your-username>.github.io/sf-interview-prep/`.

**Other free hosts** (same files, no changes): Cloudflare Pages (fastest, unlimited bandwidth),
Netlify, Vercel. All of them deploy automatically when you push to GitHub.

**Domain name.** The free `github.io` / `pages.dev` address works fine. A custom domain
(e.g. `sfprep.in`) costs roughly ₹700–1,000 per year from any registrar; point it to GitHub
Pages under Settings → Pages → Custom domain. Avoid "free domain" services; they are
unreliable and often get flagged as spam.

---

## 3. Add sign-in and saved progress with Supabase (15 minutes, free)

Why Supabase: its free tier gives you login (email magic link, Google, GitHub) **and** a
Postgres database in one place, and it is called directly from the browser, so you don't
need a server. Cloudinary and Dropbox are file/image storage; they're not designed for
per-user records like progress marks.

Free tier (check supabase.com/pricing for current numbers): 50,000 monthly active users,
500 MB database, unlimited API requests. A free project is **paused after 7 days without
any activity**; any visit resumes it, or upgrade later if the site becomes popular.

### Steps

1. Sign up at https://supabase.com and create a **New project** (choose the Mumbai region
   for Indian users). Save the database password somewhere safe.
2. **SQL Editor → New query** → paste the contents of `supabase/schema.sql` → **Run**.
   This creates the `user_progress` table and Row Level Security rules so each user can
   only read and write their own rows.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key into
   `assets/config.js`:
   ```js
   window.SF_CONFIG = {
     supabaseUrl: "https://xxxx.supabase.co",
     supabaseAnonKey: "eyJhbGciOi...",
     oauthProviders: []
   };
   ```
   The anon key is designed to be public. Never put the `service_role` key in the site.
4. **Authentication → URL Configuration**:
   - Site URL: `https://<your-username>.github.io/sf-interview-prep/`
   - Redirect URLs: add the same URL and `http://localhost:8080/` for local testing.
5. **Authentication → Providers → Email**: enabled by default (magic link). Visitors type
   their email and click the link they receive; no passwords to manage.
6. Optional social login:
   - **GitHub**: create an OAuth App at github.com/settings/developers with callback URL
     `https://xxxx.supabase.co/auth/v1/callback`, paste Client ID/Secret into Supabase →
     Providers → GitHub, then set `oauthProviders: ["github"]`.
   - **Google**: same idea with a Google Cloud OAuth client; add `"google"`.
7. Commit and push `config.js`. The "Sign in to sync" button now appears.

Supabase's built-in email sender is rate-limited (a few emails per hour) and meant for
testing. Before sharing the site widely, add your own SMTP under
Authentication → Emails → SMTP Settings. Free options: Brevo (300 emails/day) or Resend
(3,000/month).

### How progress storage works

| Visitor state | Where marks are stored |
|---|---|
| Not signed in | Browser `localStorage` (`sfprep:guest`). Survives closing the tab; lost if browser data is cleared. |
| Signs in | Guest marks are **merged** into the account (newer change wins per question), uploaded, and the guest copy is cleared. |
| Signed in | Each click saves to the browser cache immediately and to Supabase within a second. Works offline; unsent changes upload when back online. |
| Signs out | The account's cached copy is removed from that browser (important on shared computers); the account data stays safe in Supabase. |
| Another device | Signing in downloads the account's marks. |

Every question has a permanent id (e.g. `apex-104`), so editing or adding questions never
scrambles people's progress. **Never renumber or reuse an id**; add new ones instead.

---

## 4. Adding or editing questions

Each file in `data/` calls `SF.add(topic, rows)`. A row is:

```js
["apex-121", "Senior", "scenario", `Question text (HTML allowed)`, `<p>Answer HTML</p>`]
```

- id: `<topic>-<number>`, unique forever.
- level: `Basic`, `Mid`, `Senior`.
- type: `concept`, `scenario`, `code` (write code), `output` (predict output / find the bug), `design`.
- Inside the backtick strings, write `&lt;` and `&gt;` for `<` and `>` in code, and don't use
  a backtick or `${`.

To add a new topic, add it to `data/topics.js` (with a `group`, which decides its section
in the Topic dropdown) and add a `<script>` tag for its file in `index.html`.

**Cloud filter.** Every question is tagged automatically by `assets/clouds.js`:
questions in the Sales/Service/Experience Cloud topics get that cloud, others are tagged
from keywords in the question (Opportunity, Lead, Quote → Sales; Case, Omni-Channel,
Knowledge → Service; portal, guest, site → Experience), and anything left is
"Core Platform". To set clouds by hand, add a 6th element to the row:

```js
["criteria-136", "Mid", "code", `Question`, `<p>Answer</p>`, ["sales", "service"]]
```

---

## 5. Ideas to take it further

Built in already: search, multi-select Topic (grouped), Cloud, Level, Type and Progress filters, random question, shareable
deep links (`#apex-104`), per-topic progress bars, dark mode, sign-in sync.

Good next steps, roughly in order of value:

1. **Mock interview mode**: pick 10 random Senior questions across topics, hide answers,
   start a 30-minute timer, let the user self-grade each answer, show a score by topic.
2. **Spaced repetition**: when a user marks "In review", schedule it to resurface after
   1, 3, 7 and 14 days (store `next_review_at` in the same table). Show a "Due today" filter.
3. **Personal notes per question**: a `user_notes` table with the same Row Level Security.
4. **Bookmarks / custom lists** ("Questions for my Deloitte interview").
5. **Company tags**: tag questions frequently asked at TCS, Accenture, Deloitte, Salesforce.
6. **Practice coding**: link "Write code" questions to a Trailhead playground exercise or
   provide a starter snippet with a copy button.
7. **Installable app (PWA)**: add a manifest and service worker so it works fully offline on phones.
8. **SEO**: one static page per question (generate with a small Node script) so Google can
   index each question; add sitemap.xml and Open Graph tags. Keep the single-page app as the reader.
9. **Analytics without cookies**: Cloudflare Web Analytics or GoatCounter (both free).
10. **Community input**: "Suggest an edit" link that opens a pre-filled GitHub issue for each question.
