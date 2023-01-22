# ---------------------------------------------------------------------------------------------------------------------
# LAUNCH A STATIC WEBSITE USING CLOUD LOAD BALANCER
#
# This is an example of how to use the cloud-load-balancer-website module to deploy a static website with a custom domain.
# ---------------------------------------------------------------------------------------------------------------------

terraform {
  # This module is now only being tested with Terraform 1.0.x. However, to make upgrading easier, we are setting
  # 0.12.26 as the minimum version, as that version added support for required_providers with source URLs, making it
  # forwards compatible with 1.0.x code.
  required_version = ">= 0.12.26"

  required_providers {
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 3.50.0"
    }
  }
}

provider "google-beta" {
  project = var.project
}

resource "google_project" "project" {
  name       = var.project
  project_id = var.project

  labels = {
    "firebase" = "enabled"
  }
}

# ------------------------------------------------------------------------------
# CONFIGURE Service Account
# ------------------------------------------------------------------------------

resource "google_service_account" "sa" {
  account_id   = "my-service-account"
  display_name = "A service account for terraform"
  project = var.project
}

# DEVELOPMENT NOTES:
# This is a good refereces for basic roles, as well as predefined roles: https://cloud.google.com/iam/docs/understanding-roles#project-roles
# In addition to that, going to IAM -> Service Accounts -> (pick your SA) -> Permissions...
# will show you a table which can be filtered by 'permission' when debugging why an terraform/ gcloud command didn't work
resource "google_project_iam_member" "member-role" {
  for_each = toset([
    "roles/viewer",
    "roles/iam.serviceAccountUser",
    "roles/cloudsql.admin",
    "roles/secretmanager.secretAccessor",
    "roles/datastore.owner",
    "roles/storage.admin",
    "roles/cloudbuild.builds.builder",
    "roles/cloudbuild.serviceAgent",
    "roles/logging.admin",
  ])
  role = each.key
  member = "serviceAccount:${google_service_account.sa.email}"
  project = var.project
}

resource "google_service_account_key" "mykey" {
  service_account_id = google_service_account.sa.name
  public_key_type    = "TYPE_X509_PEM_FILE"
}

resource "local_file" "service_account_private_key" {
    content  = base64decode(google_service_account_key.mykey.private_key)
    filename = "../../secrets/terraform_sa_key.json"
    file_permission = "0664"
}

# ------------------------------------------------------------------------------
# CREATE THE SITE
# ------------------------------------------------------------------------------

module "static_site" {
  # When using these modules in your own templates, you will need to use a Git URL with a ref attribute that pins you
  # to a specific version of the modules, such as the following example:
  # source = "github.com/gruntwork-io/terraform-google-static-assets.git//modules/http-load-balancer-website?ref=v0.3.0"
  source = "github.com/gruntwork-io/terraform-google-static-assets.git//modules/http-load-balancer-website?ref=v0.6.0"

  project = var.project

  website_domain_name = var.website_domain_name
  website_location    = var.website_location

  force_destroy_access_logs_bucket = var.force_destroy_access_logs_bucket
  force_destroy_website            = var.force_destroy_website

  create_dns_entry      = var.create_dns_entry
  dns_record_ttl        = var.dns_record_ttl
  dns_managed_zone_name = var.dns_managed_zone_name

  enable_versioning = var.enable_versioning

  index_page     = var.index_page
  not_found_page = var.index_page

  enable_cdn  = false
  enable_ssl  = var.enable_ssl
  enable_http = var.enable_http

  ssl_certificate = join("", google_compute_ssl_certificate.certificate.*.self_link)
}

# ------------------------------------------------------------------------------
# CREATE DEFAULT PAGES
# ------------------------------------------------------------------------------

#
resource "google_storage_bucket_object" "confirm_deploy" {
  name    = "confirm_deploy.html"
  content = "Bucket provisioning complete"
  bucket  = module.static_site.website_bucket_name
}

resource "google_storage_object_acl" "confirm_deploy_acl" {
  bucket      = module.static_site.website_bucket_name
  object      = google_storage_bucket_object.confirm_deploy.name
  role_entity = ["READER:allUsers"]
}

# ------------------------------------------------------------------------------
# CREATE A CORRESPONDING GOOGLE CERTIFICATE THAT WE CAN ATTACH TO THE LOAD BALANCER
# ------------------------------------------------------------------------------

resource "google_compute_ssl_certificate" "certificate" {
  count = var.enable_ssl ? 1 : 0

  project  = var.project
  provider = google-beta

  name_prefix = "petri-test"
  description = "SSL Certificate for ${var.website_domain_name}"
  private_key = file("../../secrets/privkey.pem")
  certificate = file("../../secrets/fullchain.pem")

  lifecycle {
    create_before_destroy = true
  }
}

# NOTE: the auth stuff is incomplete, see https://github.com/hashicorp/terraform-provider-google/issues/8510.
# Authorized domains are not defined and must be entered manually.  Additionally, the redirect URL needs to be
# copy pasted into the MS Azure ID side of things.
resource "google_identity_platform_default_supported_idp_config" "microsoft" {
  enabled       = true
  idp_id        = "microsoft.com"
  client_id     = var.pax_ms_client_id
  client_secret = var.pax_ms_client_secret
  project       = var.project
}
