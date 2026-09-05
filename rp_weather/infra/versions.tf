terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "= 5.22.0"
    }
  }
}

# Authentication comes only from CLOUDFLARE_API_TOKEN.
provider "cloudflare" {}
