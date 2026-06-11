# Releasing & publishing

Maintainer docs for cutting a release of [`@exor404/mdslides`](https://www.npmjs.com/package/@exor404/mdslides).
For using the tool, see the [README](../README.md).

Releases go to the **public npm registry** (npmjs.com), so anyone can
`npx @exor404/mdslides`. A tag-triggered GitHub Actions pipeline
([`.github/workflows/package-publish.yml`](../.github/workflows/package-publish.yml))
does the publishing for you: it runs **only when you push a `v*` tag**, verifies
the tag matches `package.json`, and runs `npm publish` against npmjs.com using an
automation token stored as the `NPM_TOKEN` repository secret.

## How the pipeline works

```
push tag v0.1.3 ──► GitHub Actions ──► checkout ──► setup Node 22
                                          │
                                          ├─ guard: tag (v0.1.3) must equal
                                          │   package.json "version" (0.1.3),
                                          │   else the run fails
                                          │
                                          └─ npm publish  (auth: NPM_TOKEN)
                                                  └──► npmjs.com
```

The version guard means the git tag and the published version can never drift —
if they disagree, the run stops before publishing.

## One-time setup

You only do this once. It wires an npm token into the repo so Actions can publish
on your behalf.

1. **Create an npm automation token.** On npmjs.com: avatar → **Access Tokens** →
   **Generate New Token** → **Automation** (or a **Granular** token scoped to the
   `@exor404/mdslides` package with **Read and write**). Copy the value — npm
   shows it only once.
2. **Add it to GitHub as a secret.** Repo → **Settings** → **Secrets and
   variables** → **Actions** → **New repository secret**. Name it exactly
   `NPM_TOKEN`, paste the token, **Add secret**. (It's a *secret*, not a
   *variable* — secrets are encrypted and hidden from logs.)

> The very first version must exist on npm before automation can update it.
> If the package isn't published yet, do one manual publish first:
> `npm login && npm publish --access public`.

### Rotate the token every 90 days

For security, **refresh the `NPM_TOKEN` at least every 90 days** — a leaked
long-lived token can publish malicious versions, so it should be short-lived and
rotated on a schedule. Set the token's expiry to 90 days when you create it on
npmjs.com (granular tokens let you pick an expiry), put a recurring reminder on
your calendar, and when it's due:

1. On npmjs.com, generate a fresh token (same scope: read+write on
   `@exor404/mdslides`).
2. In GitHub, update the `NPM_TOKEN` secret with the new value
   (**Settings → Secrets and variables → Actions → `NPM_TOKEN` → Update**).
3. Revoke the old token on npmjs.com.

If a release run fails with a `401`/`403` auth error, an expired or revoked
token is the first thing to check.

## Cutting a release

Once the secret is in place, every release is three commands:

```bash
npm version patch          # bumps package.json (0.1.2 → 0.1.3) and commits + tags v0.1.3
git push origin main       # push the version-bump commit
git push origin v0.1.3     # push the tag → the pipeline publishes
```

`npm version patch` (or `minor` / `major`) bumps `package.json`, makes the commit,
and creates the matching `vX.Y.Z` tag in one step. Pushing that tag is what
triggers the workflow. Watch it run under the repo's **Actions** tab; when it goes
green the new version is live on npm.

**Prefer to bump by hand?** Edit `"version"` in `package.json`, then:

```bash
git commit -am "🔖 Release 0.1.3"
git tag v0.1.3             # must match package.json exactly, or the guard fails
git push && git push --tags
```
