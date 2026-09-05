variable "account_id" {
  type        = string
  description = "Cloudflare account ID (not a zone ID)."
  validation {
    condition     = can(regex("^[a-fA-F0-9]{32}$", var.account_id))
    error_message = "account_id must be a 32-character hexadecimal account ID."
  }
}

variable "worker_name" {
  type    = string
  default = "rp-weather-api"
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$", var.worker_name))
    error_message = "Use a 2-63 character lowercase name containing letters, digits and internal hyphens."
  }
}

variable "pages_project_name" {
  type    = string
  default = "rp-weather-dashboard"
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,56}[a-z0-9]$", var.pages_project_name))
    error_message = "Use a 2-58 character lowercase Pages project name."
  }
}

variable "workers_subdomain" {
  type        = string
  description = "Existing account workers.dev subdomain, without .workers.dev. Set this up once in Cloudflare."
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.workers_subdomain))
    error_message = "Supply only the account subdomain label, not a URL."
  }
}

variable "production_branch" {
  type    = string
  default = "main"
}

variable "compatibility_date" {
  type    = string
  default = "2026-09-01"
}

variable "discord_public_key" {
  type = string
  validation {
    condition     = can(regex("^[a-fA-F0-9]{64}$", var.discord_public_key))
    error_message = "Discord public key must contain 64 hexadecimal characters."
  }
}

variable "discord_guild_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{17,20}$", var.discord_guild_id))
    error_message = "Supply the Discord guild snowflake as a string."
  }
}

variable "discord_channel_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{17,20}$", var.discord_channel_id))
    error_message = "Supply the Discord channel snowflake as a string."
  }
}

variable "discord_allowed_user_ids" {
  type        = string
  description = "Nonempty comma-separated Discord user IDs, without spaces."
  validation {
    condition     = can(regex("^[0-9]{17,20}(,[0-9]{17,20})*$", var.discord_allowed_user_ids))
    error_message = "Supply at least one Discord user ID, comma-separated with no spaces."
  }
}

variable "latitude" {
  type = number
  validation {
    condition     = var.latitude >= -90 && var.latitude <= 90
    error_message = "Latitude must be between -90 and 90."
  }
}

variable "longitude" {
  type = number
  validation {
    condition     = var.longitude >= -180 && var.longitude <= 180
    error_message = "Longitude must be between -180 and 180."
  }
}
