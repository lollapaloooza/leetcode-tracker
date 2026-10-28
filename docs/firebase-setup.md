# Firebase setup: the owner's steps

What you do in the Firebase console, once, before the hosting and sign-in work in [ADR-002](adr/0002-hosting-auth-sync.md) starts. The code (config files, security rules, the deploy script, the sign-in button) is written in the repo; these steps need your Google account, so only you can do them.

**Time:** about 20 minutes. **Cost:** $0. Everything stays on the free Spark plan, and no billing account is needed.

**Status (2026-10-27):**
- **Received:** the web config, for project `leetcode-tracker-lollapalooza`. It's in `.env`.
- **Decisions:** the other two decisions use the recommendations below until the owner says otherwise.
- **Built in the repo:** hosting, the rules and sign-in (section 5, steps 1–2).
- **Still the owner's:** log the CLI in (section 3), then run the first deploy (section 5).

## 1. Decide three things first

| Question | Recommended | Why it matters |
|---|---|---|
| **Project ID** (it becomes the URL) | Something short, like `leetcode-tracker-<your-initials>` | The app lives at `https://<project-id>.web.app`. The ID can't be changed later. |
| **Who can sign in?** | Anyone with a Google account, each with their own separate data | It costs nothing on Spark, and the security rules keep each person's data private. Limiting it to you is a one-line rule change later. |
| **Should a running timer sync?** | Yes: start on the laptop, see it on the phone | It's already part of the saved data. If two devices disagree, the newer change wins. |

A custom domain can come later; it doesn't change anything below.

## 2. In the Firebase console

Open [console.firebase.google.com](https://console.firebase.google.com) signed in with the Google account that should own the project.

### Step 1: Create the project

1. **Create a project**, and enter the name. Check the **project ID** under it; click it to edit if you want the one from section 1.
2. Turn **Google Analytics off**. The app doesn't use it.
3. Gemini in Firebase is optional and changes nothing for the app.
4. Wait for "Your project is ready", then **Continue**.

### Step 2: Register the web app

1. On the project overview, click the **Web** icon (`</>`).
2. Nickname: `leetcode-tracker-web`. Leave **"Also set up Firebase Hosting"** unticked; the repo will configure hosting itself.
3. **Register app.** Firebase shows a `firebaseConfig` object with `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` and `appId`.
4. **Copy that object and paste it to me.** It's not a secret: it only names the project, and the security rules protect the data.

You can find it again later under **Project settings** (the gear) › **General** › **Your apps**.

### Step 3: Turn on Google sign-in

1. Open **Authentication** (under **Security** in the left menu), then **Get started**.
2. On the **Sign-in method** tab, choose **Google** and switch on **Enable**.
3. **Support email for project:** your email. Google shows it on the sign-in screen.
4. **Save.**
5. On the **Settings** tab › **Authorized domains**, check that `localhost`, `<project-id>.firebaseapp.com` and `<project-id>.web.app` are all listed. They usually are already; add any that's missing.

### Step 4: Create the database

1. Open **Firestore** (under **Databases & Storage**), then **Create database**.
2. If it asks for an edition, choose **Standard**. Enterprise is a different, paid product.
3. **Location:** the region closest to you. This **can't be changed later**.
4. **Start in production mode.** It blocks all access until the repo's rules are deployed. Don't pick test mode: it lets anyone read and overwrite everything for 30 days.
5. **Create.**

### Step 5: Name the sign-in screen

Without this step, Google's sign-in popup says "continue to `<project-id>.firebaseapp.com`" instead of the app's name.

1. In the console, open **Project settings** › **General** and find **Public-facing name**. Set it to `LeetCode Tracker`.
2. Optionally, open [Google Cloud console](https://console.cloud.google.com) › **Google Auth Platform** › **Branding** for the same project. There you can add a logo, and check that **Audience** says *In production*. If it says *Testing*, only test users you add can sign in.

## 3. On your machine

Log the Firebase CLI in once. It opens a browser for you to sign in, and the login stays on your machine:

```bash
npx firebase-tools@15.33.0 login
```

When it asks about Gemini or usage data, either answer is fine. Never paste the login token or a "service account key" into chat or into the repo; nothing here needs one.

## 4. Send me

- the `firebaseConfig` object from step 2;
- your answers to the three questions in section 1, or "use the recommendations";
- confirmation that `npx firebase-tools@15.33.0 projects:list` shows your project.

## 5. In the repo

1. **Hosting** (ADR-002 Phase 1). *Done.*
   - `firebase.json` with the cache headers, `.firebaserc`, and `npm run deploy`;
   - `firebase-tools@15.33.0`, pinned, as a dev dependency.
   - **The first deploy is yours:** `npm run deploy` checks, builds, and publishes the site with the Firestore rules. It needs step 4's database to exist, since it deploys the rules too.
2. **Sign-in.** *Done.*
   - `firestore.rules`: each user can read and write only their own document.
   - The Firebase config in `.env`.
   - `firebase/auth` in a lazy chunk, so signed-out visitors download none of it.
   - The account row in Settings › Your data, with unit tests against a fake sign-in provider.
   - **Emulator tests come later**, with the integration tests. `npm run emulators` needs Java 21 or newer.
3. **Sync** comes next, starting with ADR-002 Phase 0: tabs sharing one copy, and `merge3()` with tests.

## 6. After the first deploy

These need the live URL, so they come once the app is up.

- **Restrict the API key:**
  1. In Google Cloud console, open **APIs & Services** › **Credentials** › **Browser key (auto created by Firebase)**.
  2. Under **Application restrictions**, choose **Websites** and add:
     - `https://<project-id>.web.app/*`
     - `https://<project-id>.firebaseapp.com/*`
     - `http://localhost:5173/*`
  3. Leave **API restrictions** as they are; narrowing them can break sign-in.
- **Not needed for now: the redirect URI.** Sign-in uses a popup, which works with the default `<project-id>.firebaseapp.com` auth domain in every browser. Only redirect sign-in is affected by browsers that block third-party storage, and it would only come with a home-screen app. If that happens:
  1. In Google Cloud console, open **APIs & Services** › **Credentials** › the **Web client (auto created by Google Service)**.
  2. Add `https://<project-id>.web.app/__/auth/handler` under **Authorized redirect URIs**.
  3. Set `authDomain` to `<project-id>.web.app`.

## Free-plan limits (Spark)

| Service | Free allowance | This app's use |
|---|---|---|
| Hosting | 10 GB stored, 360 MB transferred a day | About 0.3 MB for a first visit, almost nothing after that thanks to caching |
| Firestore | 50,000 reads and 20,000 writes a day, 1 GiB stored | A heavy day is at most about 300 reads and 100 writes |
| Authentication (Google sign-in) | Far beyond personal use | 1 person |

When a limit runs out, that service pauses until its quota resets, and the app keeps working locally. Nothing is ever billed. ADR-002 §4 has the full load estimate.
