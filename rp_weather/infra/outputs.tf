output "account_id" {
  value = var.account_id
}
output "worker_name" {
  value = cloudflare_workers_script.api.script_name
}
output "pages_project_name" {
  value = cloudflare_pages_project.frontend.name
}
output "production_branch" {
  value = cloudflare_pages_project.frontend.production_branch
}
output "pages_url" {
  value = "https://${cloudflare_pages_project.frontend.subdomain}"
}
output "worker_url" {
  value = "https://${cloudflare_workers_script.api.script_name}.${var.workers_subdomain}.workers.dev"
}
output "discord_interactions_url" {
  value = "https://${cloudflare_workers_script.api.script_name}.${var.workers_subdomain}.workers.dev/discord/interactions"
}
output "dashboard_kv_namespace_id" {
  value = cloudflare_workers_kv_namespace.dashboard.id
}
