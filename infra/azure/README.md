# Deploying to Azure

The app is served at **https://shaw-mfg.azurewebsites.net**.

## Why App Service and not Static Web Apps

Two reasons, either one decisive:

**The hostname is not choosable on the alternatives.** App Service is the only
Azure compute where the free hostname *is* the resource name you pick — site
`shaw-mfg` answers on `shaw-mfg.azurewebsites.net`. Static Web Apps appends a
random token (`shaw-mfg-a1b2c3d4.eastus2.azurestaticapps.net`) and Container
Apps appends a random environment segment
(`shaw-mfg.calmriver-1a2b3c4d.eastus.azurecontainerapps.io`). Neither is
configurable.

> App Service also has an opt-in *unique default hostname* mode that adds a
> suffix, and the portal now defaults new apps to it — which is why
> `navanta-beacon-app` ended up as
> `navanta-beacon-app-gmftgdgqbraaefet.centralus-01.azurewebsites.net`.
> `provision.sh` creates the site without that property, so the plain hostname
> is what you get. Don't recreate this app through the portal.

**`src/proxy.ts` needs a server.** The persona route guard reads a cookie and
redirects on every request, so this cannot be a static export — and Static Web
Apps' hybrid Next.js support is preview-only and requires the Standard plan.

## What runs where

`next.config.ts` sets `output: "standalone"`, so `next build` emits a
self-contained server with a pruned `node_modules`. CI builds it and ships the
result; **App Service never runs `npm install`**, which keeps the private
GitHub Packages token a CI-only concern. `SCM_DO_BUILD_DURING_DEPLOYMENT=false`
enforces that — without it Oryx rebuilds on the host and fails on a 401 from
`npm.pkg.github.com`.

## First deploy

Run these in order, from the repository root.

**1. Sign in and select the subscription.**

```bash
az login
az account set --subscription "Azure subscription 1"
```

**2. Provision the App Service.** Idempotent — safe to re-run.

```bash
./infra/azure/provision.sh
```

Deploys into the existing `Shaw-supply-chain` resource group in `centralus`,
creating a Free (F1) Linux plan `asp-shaw-mfg` and site `shaw-mfg` on Node 22,
then sets the startup command, forces HTTPS, enables SCM basic auth, and turns on
log streaming.

The `Shaw-supply-chain-prototype` Static Web App already in that group
(`ambitious-sea-0fead7c10.7.azurestaticapps.net`) is a different app and is left
untouched. To provision on Basic instead: `SKU=B1 ./infra/azure/provision.sh`.

**3. Give GitHub Actions its deploy credential.**

```bash
SUBSCRIPTION_ID=$(az account show --query id --output tsv)
az rest --method post \
  --url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/Shaw-supply-chain/providers/Microsoft.Web/sites/shaw-mfg/publishxml?api-version=2023-12-01" |
  gh secret set AZURE_WEBAPP_PUBLISH_PROFILE --repo Navanta-AI/shaw-mfg
```

`az webapp deployment list-publishing-profiles` is the documented way to do this
and does the same thing — but it parses XML, so it fails on the CLI installs
described under *Troubleshooting*. The REST call always works.

**4. Commit and push.** Pushing to `main` deploys.

```bash
git add next.config.ts .github/workflows infra/azure
git commit -m "ci: deploy to Azure App Service"
git push
```

**5. Watch it.**

```bash
gh run watch
```

**6. Verify.** Expect a `307` to `/overview` — the persona guard in `proxy.ts`
redirecting off `/`. On F1 the first request after idle pays a cold start, so
allow up to a minute.

```bash
curl -sS -o /dev/null -w '%{http_code} -> %{redirect_url}\n' https://shaw-mfg.azurewebsites.net
```

Subsequent deploys are just step 4.

## Free tier limits

F1 is genuinely free, with limits worth knowing before a live demo:

| | F1 (free) | B1 (~$13/mo) |
| --- | --- | --- |
| CPU | 60 minutes/day, then **HTTP 403** until midnight UTC | unmetered |
| Memory | 1 GB | 1.75 GB |
| Always On | unavailable — cold start after ~20 min idle | available |
| Custom domains | unavailable | supported, with a free managed certificate |

`shaw-mfg.azurewebsites.net` works on F1; a domain like `shaw.navanta.ai` does
not. **For a demo to Shaw, provision B1** — a cold start mid-presentation, or a
403 because someone browsed the app that morning, is not a risk worth taking:

```bash
az appservice plan update --name asp-shaw-mfg --resource-group Shaw-supply-chain --sku B1
az webapp config set --name shaw-mfg --resource-group Shaw-supply-chain --always-on true
```

Downgrade with `--sku F1` (drop the `always-on` line) when the demo is over.

## Troubleshooting

**Tail the logs.**

```bash
az webapp log tail --name shaw-mfg --resource-group Shaw-supply-chain
```

**Container starts, then every request times out.** `HOSTNAME`. App Service sets
it to the container id and Next's standalone server reads it as a bind address.
`startup.sh` exports `HOSTNAME=0.0.0.0` to prevent this; confirm the startup
command is still `sh startup.sh`:

```bash
az webapp config show --name shaw-mfg --resource-group Shaw-supply-chain --query appCommandLine
```

**Pages render unstyled, assets 404.** `public/` or `.next/static` missing from
the bundle — see the *Assemble the standalone bundle* step in the workflow.

**`npm ci` fails with 401 from npm.pkg.github.com.** The workflow token can't
read `@navanta-ai/design-system`. Either add this repository under the package's
*Manage Actions access*, or set a classic PAT with `read:packages` as
`PACKAGES_READ_TOKEN`; the workflow prefers it when present.

**The deploy step returns 401.** SCM basic auth got disabled (a tenant policy
can re-disable it). Re-run `provision.sh`, then refresh the publish profile
secret — step 3 above.

**Never deploy a bundle built on macOS.** The standalone `node_modules` carries
whatever platform Next resolved at build time — a local build ships
`@img/sharp-darwin-arm64` and no Linux binary, which App Service cannot load.
The workflow builds on `ubuntu-latest` for this reason; don't shortcut it with
`az webapp deploy` from a laptop.

**`az webapp create` / `az webapp show` crash with `ImportError: ... pyexpat`.**
A broken CLI install, not an Azure problem: Homebrew's Python is linked against
an older `/usr/lib/libexpat.1.dylib` that lacks a symbol `pyexpat` needs. Every
`az webapp` subcommand that resolves the FTP publishing URL dies on it. The site
is usually created anyway — `provision.sh` verifies over REST rather than
trusting the exit code, so re-running it completes cleanly. To repair the CLI:

```bash
brew reinstall python@3.13 azure-cli
```

## Hardening the credential

A publish profile is a long-lived password, which is why it's one secret and a
two-minute setup. To move to federated credentials instead, create an Entra app
registration with a federated credential scoped to
`repo:Navanta-AI/shaw-mfg:ref:refs/heads/main`, give it Contributor on
`Shaw-supply-chain`, add `id-token: write` to the job's permissions, insert an
`azure/login@v2` step, and drop `publish-profile` from the deploy step. That
needs directory permissions to register an application — the publish profile
does not.
