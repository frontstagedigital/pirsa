# PIRSA

## Quick start

#### `npm install`:

Install the dependencies.
Node version 20.5.1.

#### `npm run dev`:

Run the app, you can view the app by visiting `http://localhost:1234/`.

---

#### `npm run build`:

Builds the website for production to the dist folder.


## Branch Structure

- master
- dev (merge into here)
- feature/name-here


### Build errors

If new pages are throwing build errors delete the /dist and /.parcel-cache folders and try again.

###Accessibility Checks (Pa11y)
Every pull request automatically runs an accessibility check using Pa11y, just to keep things in good shape.

How it works:
- The workflow lives in .github/workflows/pa11y-a11y-check.yml.
- When you open a PR, the site gets built and served locally.
- Pa11y crawls every .html page inside the dist/ folder and checks for accessibility issues.
- Enabled caching using setup-node’s built-in cache: 'npm'

If it finds problems:
- The build will fail if A11Y_ENFORCE=true (which it is by default).

If you need to bypass temporarily, you can set A11Y_ENFORCE=false. It'll let you through but still report the issues, so you know they’re there.

Why it’s here:
We want to make sure the site works well for everyone. Pa11y helps us catch issues early, while we’re still in PRs.
