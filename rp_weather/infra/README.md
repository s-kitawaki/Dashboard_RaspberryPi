# Weather dashboard infrastructure

Terraform owns the Cloudflare Pages Direct Upload project, separate Worker code,
`DASHBOARD_KV`, the hourly UTC cron (`0 * * * *`), Pages `API` service bindings,
and the enabled Worker workers.dev endpoint. Wrangler uploads only the Pages
assets and Functions. No Git integration or custom domain is required.

## Deployment contract

- `frontend/npm run build` must generate the static Vue app in `frontend/dist`.
  Use relative `/api/weather`, `/api/forecast`, `/api/rate` browser URLs.
- `backend/npm run build` must bundle TypeScript and all dependencies into the
  single ES module `backend/dist/index.js`, with a default export implementing
  `fetch` and `scheduled`. Plain `tsc` output with unresolved local/package imports
  is insufficient. Terraform uploads only this file.
- Each app needs a committed `package-lock.json`; builds use `npm ci`.
- The Pages Function at `frontend/functions/api/[[path]].ts` forwards the original
  request through `env.API.fetch`, preserving `/api`, query, headers and body.
- The Worker serves `/api/weather`, `/api/forecast`, `/api/rate`, and
  `/discord/interactions`. Register the last route using Terraform's
  `discord_interactions_url` output in the Discord Developer Portal.
- Public API GETs only read hourly KV snapshots; they never fetch upstream data
  or initialize the cache. HTTP 503 JSON is expected until the first successful
  cron run (and for a snapshot that has not been populated).
- The Worker must validate Discord signatures and enforce the configured guild,
  channel and user allowlist. The proxy does not add authentication.
- Production **and preview** Pages Functions use the same production Worker/KV.
  For isolated staging, use another Terraform state, project and Worker name.
  The helper explicitly deploys the configured production branch regardless of
  the current Git branch.

## Schema decisions

Cloudflare provider is pinned to **5.22.0** (the current v5 release checked for this
implementation), rather than allowing an unreviewed minor upgrade. Relevant
official versioned schemas:

- [Worker script](https://github.com/cloudflare/terraform-provider-cloudflare/blob/v5.22.0/docs/resources/workers_script.md):
  `script_name`, `main_module`, `content_file` plus `content_sha256`; bindings use
  the v5 list of objects. `keep_bindings = ["secret_text"]` retains separately
  uploaded secrets on code updates, without ignoring ordinary binding changes.
- [Pages project](https://github.com/cloudflare/terraform-provider-cloudflare/blob/v5.22.0/docs/resources/pages_project.md):
  `deployment_configs.production.services.API = { service = worker_name }`, also
  set for preview. The property is `services`, not `service_bindings`.
- [Cron schema source](https://github.com/cloudflare/terraform-provider-cloudflare/blob/v5.22.0/internal/services/workers_cron_trigger/schema.go):
  requires `schedules = [{ cron = "0 * * * *" }]`. The generated documentation's
  example still says `body`; the schema and implementation say `schedules`.
- [Worker subdomain](https://github.com/cloudflare/terraform-provider-cloudflare/blob/v5.22.0/docs/resources/workers_script_subdomain.md)
  enables the public endpoint and disables version preview URLs.
- [KV namespace](https://github.com/cloudflare/terraform-provider-cloudflare/blob/v5.22.0/docs/resources/workers_kv_namespace.md)
  provides the namespace ID used by the Worker binding.
- [Pages service bindings](https://developers.cloudflare.com/pages/functions/bindings/#service-bindings)
  and [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
  describe the runtime and deployment mechanism. Wrangler must run from
  `frontend` so it discovers `functions` alongside `dist`.

## Prerequisites

Use Node.js 22+ (24 LTS recommended), npm, PowerShell 7+ (`pwsh`, available on
Windows/macOS/Linux), and Terraform 1.6+ below 2.0. The deployment tools pin
Wrangler 4.129.0 with their own npm lockfile.

Create a Cloudflare API token scoped to the target account with Workers Scripts
Edit, Workers KV Storage Edit, and Cloudflare Pages Edit permissions (including
read access). If Cloudflare requests Workers Tail Read for the script/subdomain
resources, add that permission. Export it as `CLOUDFLARE_API_TOKEN`; Terraform
reads it directly. The helpers obtain the account ID from Terraform outputs.

Register the account's workers.dev subdomain once in Cloudflare Workers & Pages
before applying. `workers_subdomain` is that existing label (not the Worker name,
and without `.workers.dev`). Terraform enables this Worker's endpoint but does
not rename the account-wide subdomain. A wrong label produces wrong output URLs.
Choose an available globally unique Pages project name.

## First deployment

From the repository root, in PowerShell:

```powershell
Copy-Item rp_weather/infra/terraform.tfvars.example rp_weather/infra/terraform.tfvars
# Edit terraform.tfvars with your public identifiers, location and names.

# Prompt without putting credentials in command history, or inject from CI secrets.
$env:CLOUDFLARE_API_TOKEN = Read-Host 'Cloudflare API token' -MaskInput
$env:OPENWEATHER_API_KEY = Read-Host 'OpenWeather API key' -MaskInput
$env:DISCORD_WEBHOOK_URL = Read-Host 'Discord webhook URL' -MaskInput
$env:TWELVE_DATA_API_KEY = Read-Host 'Twelve Data API key' -MaskInput

./rp_weather/scripts/deploy.ps1
./rp_weather/scripts/smoke-test.ps1 -AllowUninitialized
```

`deploy.ps1` builds both apps, initializes and validates Terraform, applies it
with Terraform's normal plan/confirmation, uploads the three secrets, then deploys
Pages. Use `-AutoApprove` only for an intended unattended apply; `-SkipBuild`
uses artifacts already built by CI. Scripts resolve paths from their own location
and stop on failed commands. Credentials must be present before any apply.
There can be a short bootstrap interval before secrets are uploaded; the first
cron/API call may fail during this interval. If a later step fails, completed
cloud changes remain; fix the cause and rerun that step or the deployment.

| Worker binding | Provisioning |
| --- | --- |
| `DASHBOARD_KV` | Terraform KV namespace |
| `DISCORD_PUBLIC_KEY` | Plain Terraform variable `discord_public_key` |
| `DISCORD_GUILD_ID`, `DISCORD_CHANNEL_ID` | Plain string variables; preserve snowflake digits |
| `DISCORD_ALLOWED_USER_IDS` | Plain nonempty CSV string; no spaces |
| `LATITUDE`, `LONGITUDE` | Validated numbers converted to plain string bindings |
| `OPENWEATHER_API_KEY` | Secret, from process environment |
| `DISCORD_WEBHOOK_URL` | Secret, from process environment |
| `TWELVE_DATA_API_KEY` | Secret, for the backend's USDJPY Twelve Data quote |

Secrets are written using Cloudflare's [script secret API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/secrets/methods/update/).
The helper sends them in memory, never as command arguments, Terraform inputs,
or files. Do not enable PowerShell tracing or HTTP debug logging while uploading.
**Terraform state:** a Terraform `secret_text` binding with a supplied `text`
value would store that secret in state; marking a variable `sensitive` only hides
terminal output and does not encrypt state. This implementation deliberately
does not declare secret values in Terraform. Cloudflare does not return their plaintext on subsequent reads. Names may appear
in Terraform refresh state, but these scripts do not give Terraform secret values.

## Routine operations

```powershell
# Build without deploying:
./rp_weather/scripts/build.ps1

# Inspect infrastructure changes after building:
terraform -chdir=rp_weather/infra init
terraform -chdir=rp_weather/infra fmt -check
terraform -chdir=rp_weather/infra validate
terraform -chdir=rp_weather/infra plan

# Rotate all three Worker secrets (load environment variables first):
./rp_weather/scripts/set-secrets.ps1

# Frontend-only upload after rebuilding frontend/dist:
./rp_weather/scripts/deploy-pages.ps1

# Outputs and end-to-end API checks:
terraform -chdir=rp_weather/infra output
./rp_weather/scripts/smoke-test.ps1
```

The smoke test requires HTTP 200 and valid JSON on all three routes through both
origins; it detects an accidental SPA fallback returning HTML. Allow Cloudflare
deployment propagation before retrying. Cron changes can take up to 15 minutes
to propagate. Inspect the Worker's logs and KV after an hourly run to verify its
`scheduled` handler; uploading a cron does not itself populate the cache.
Discord signature/PING handling and upstream weather/rate behavior belong to the
backend and require its own integration checks. Immediately after first deploy,
use `smoke-test.ps1 -AllowUninitialized` to tolerate HTTP 503 JSON, then rerun
without that switch after the first successful hourly cron. A tolerated 503 is
not evidence that upstream data collection works.

For local scheduled-handler testing, run `npx wrangler dev --test-scheduled`
from `rp_weather/backend` with the backend's local bindings/secrets configured,
then request `http://localhost:8787/__scheduled`. This only initializes local
state; it does not prime production KV. The next local API requests should read
those snapshots. See [Cloudflare cron testing](https://developers.cloudflare.com/workers/configuration/cron-triggers/#test-cron-triggers-locally).

## Discord slash command registration

Authorize the application in the configured guild with the `applications.commands`
scope and configure its interactions URL after Worker deployment. Then run:

```powershell
$env:DISCORD_APPLICATION_ID = 'your-application-id'
$env:DISCORD_GUILD_ID = 'same-guild-id-as-terraform'
$env:DISCORD_BOT_TOKEN = Read-Host 'Discord bot token' -MaskInput
./rp_weather/scripts/register-commands.ps1 -DryRun  # inspect payload offline
./rp_weather/scripts/register-commands.ps1
Remove-Item Env:DISCORD_BOT_TOKEN
```

The bot token is used only by this local registration script; it is never a
Terraform variable, Worker binding, Pages variable or committed file. The script
upserts three guild commands individually, preserving unrelated commands:
`/entry order:<required string, "price [long|short]">`, `/exit`, and `/position`.
Re-running updates the same names. `/entry` deliberately uses one free-text
option (1-40 characters) so the user types `156.2111 long` in a single step;
Discord slash commands cannot take positional arguments. The backend parses it
and requires a price strictly above zero and at most 1,000,000; the side accepts
`long`/`short`, `l`/`s` or `買い`/`売り` and defaults to `long` when omitted.
Quantity is no longer collected, so notifications report per-USD profit only.
The commands operate on one shared USDJPY position, with the configured guild/channel/user allowlist enforced
by the backend. Guild command visibility itself does not enforce the allowlist.
See [Discord's official command API](https://docs.discord.com/developers/interactions/application-commands#create-guild-application-command).

The secret uploader rejects webhook URLs unless they exactly match
`https://discord.com/api/webhooks/id/token`, with a numeric ID and token containing
letters, digits, underscores or hyphens. Query strings (including `wait`), fragments,
other hosts, ports and trailing slashes are rejected before cloud changes.

Do not run `wrangler deploy` on the backend or maintain a competing Pages Wrangler
config. Terraform owns these settings. Redeploy Pages after service binding
changes. For rollback, rebuild the desired revision and rerun deployment; this
keeps code and configuration represented by Terraform.

## State and credentials

Local state is the default. Keep state/backups, plans and `.tfvars` private; they
are ignored within `infra`. Commit `.terraform.lock.hcl` and the scripts' npm
lockfile. For team/CI operation configure a shared encrypted Terraform backend
with locking before the first apply, or migrate existing state with
`terraform init -migrate-state`. Never start each deployment with empty state.
Use one writer at a time for code deployment and secret rotation.

If resources already exist, import them before applying rather than creating
duplicates; official schema links list import IDs. `terraform destroy` deletes
the Pages project, Worker and KV including its cache; only run it when that is
intended. No cloud deployment or authenticated smoke test is performed by merely
adding these files.

Provider v5.22.0 warns that deleting the cron resource from Terraform does not
delete its schedules through the API. To disable cron while keeping the Worker,
set `schedules = []` and apply before removing that resource. Do not assume that
removing the cron resource from configuration stops scheduled invocations.

## Implementation validation

Validated using Terraform 1.16.1 downloaded to a temporary directory and checked
against HashiCorp's published SHA-256 checksum list. `init -backend=false`,
`fmt -check` and `validate` passed with the actual Cloudflare 5.22.0 provider.
A plan with example public values, a dummy token and refresh disabled succeeded:
five resources to create, none to change or destroy. No apply was run.
Wrangler 4.129.0 compiled the Pages Function; local checks verified unchanged
request/response forwarding, PowerShell syntax, strict webhook validation and
the registration payload through a mocked Discord endpoint. Authenticated
deployment and smoke checks remain to be run with the target account.
