locals {
  worker_bundle = abspath("${path.module}/../backend/dist/index.js")
  plain_bindings = {
    DISCORD_PUBLIC_KEY       = var.discord_public_key
    DISCORD_GUILD_ID         = var.discord_guild_id
    DISCORD_CHANNEL_ID       = var.discord_channel_id
    DISCORD_ALLOWED_USER_IDS = var.discord_allowed_user_ids
    LATITUDE                 = tostring(var.latitude)
    LONGITUDE                = tostring(var.longitude)
  }
  pages_environment = {
    compatibility_date = var.compatibility_date
    services = {
      API = { service = cloudflare_workers_script.api.script_name }
    }
  }
}

resource "cloudflare_workers_kv_namespace" "dashboard" {
  account_id = var.account_id
  title      = "${var.worker_name}-dashboard"
}

resource "cloudflare_workers_script" "api" {
  account_id         = var.account_id
  script_name        = var.worker_name
  main_module        = "index.js"
  content_file       = local.worker_bundle
  content_sha256     = filesha256(local.worker_bundle)
  content_type       = "application/javascript+module"
  compatibility_date = var.compatibility_date
  # Secret values are uploaded separately; retain them on every code upload.
  keep_bindings = ["secret_text"]
  bindings = concat(
    [{ name = "DASHBOARD_KV", type = "kv_namespace", namespace_id = cloudflare_workers_kv_namespace.dashboard.id }],
    [for name, value in local.plain_bindings : { name = name, type = "plain_text", text = value }]
  )
}

resource "cloudflare_workers_script_subdomain" "api" {
  account_id       = var.account_id
  script_name      = cloudflare_workers_script.api.script_name
  enabled          = true
  previews_enabled = false
}

resource "cloudflare_workers_cron_trigger" "hourly" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.api.script_name
  schedules   = [{ cron = "0 * * * *" }]
}

# Direct Upload: Terraform owns configuration; Wrangler uploads built assets/functions.
resource "cloudflare_pages_project" "frontend" {
  account_id        = var.account_id
  name              = var.pages_project_name
  production_branch = var.production_branch
  build_config = {
    root_dir        = "rp_weather/frontend"
    destination_dir = "dist"
  }
  deployment_configs = {
    production = local.pages_environment
    preview    = local.pages_environment
  }
}
