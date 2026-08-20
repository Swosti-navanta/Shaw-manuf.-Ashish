#!/usr/bin/env bash
#
# Provisions the Azure App Service behind https://shaw-mfg.azurewebsites.net
#
# App Service is the only Azure compute where the hostname is the resource name
# you pick: site `shaw-mfg` is served at `shaw-mfg.azurewebsites.net`, for free.
# Static Web Apps appends a random token (`...-a1b2c3d4.eastus2.azurestaticapps.net`)
# and Container Apps appends a random environment segment; neither is choosable.
#
# Safe to re-run: every step is skipped if the resource already exists.
set -euo pipefail

readonly SITE_NAME="${SITE_NAME:-shaw-mfg}"
readonly RESOURCE_GROUP="${RESOURCE_GROUP:-Shaw-supply-chain}"
readonly APP_SERVICE_PLAN="${APP_SERVICE_PLAN:-asp-shaw-mfg}"
readonly LOCATION="${LOCATION:-centralus}"

# F1 is the free tier: 1 GB RAM, 60 CPU-minutes/day, no Always On (so the first
# request after idle pays a cold start), and no custom domains. B1 (~$13/mo)
# lifts all four. Override with `SKU=B1 ./infra/azure/provision.sh`.
readonly SKU="${SKU:-F1}"

readonly NODE_RUNTIME="NODE:22-lts"
readonly STARTUP_COMMAND="sh startup.sh"

log() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

require_login() {
  if ! az account show --output none 2>/dev/null; then
    echo "Not signed in. Run: az login" >&2
    exit 1
  fi
  log "Subscription: $(az account show --query 'name' --output tsv) ($(az account show --query 'id' --output tsv))"
}

# The site name is a global DNS label, so a name taken in *any* subscription
# blocks it here. Fail loudly before creating a resource group nothing will use.
assert_hostname_available() {
  local subscription_id available
  subscription_id="$(az account show --query 'id' --output tsv)"
  available="$(az rest \
    --method post \
    --url "https://management.azure.com/subscriptions/${subscription_id}/providers/Microsoft.Web/checknameavailability?api-version=2023-12-01" \
    --body "{\"name\":\"${SITE_NAME}\",\"type\":\"Microsoft.Web/sites\"}" \
    --query 'nameAvailable' --output tsv)"

  if [[ "${available}" != "true" ]]; then
    echo "Hostname ${SITE_NAME}.azurewebsites.net is already taken. Set SITE_NAME to something else." >&2
    exit 1
  fi
  log "Hostname ${SITE_NAME}.azurewebsites.net is available"
}

resource_group_exists() {
  [[ "$(az group exists --name "${RESOURCE_GROUP}")" == "true" ]]
}

app_service_plan_exists() {
  az appservice plan show --name "${APP_SERVICE_PLAN}" --resource-group "${RESOURCE_GROUP}" --output none 2>/dev/null
}

# Deliberately ARM REST and not `az webapp show`: that command eagerly resolves
# the FTP publishing URL, which parses XML, which dies outright on a CLI whose
# pyexpat is linked against a mismatched libexpat. See README troubleshooting.
site_exists() {
  local subscription_id
  subscription_id="$(az account show --query 'id' --output tsv)"
  az rest \
    --method get \
    --url "https://management.azure.com/subscriptions/${subscription_id}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/sites/${SITE_NAME}?api-version=2023-12-01" \
    --output none 2>/dev/null
}

site_hostname() {
  local subscription_id
  subscription_id="$(az account show --query 'id' --output tsv)"
  az rest \
    --method get \
    --url "https://management.azure.com/subscriptions/${subscription_id}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/sites/${SITE_NAME}?api-version=2023-12-01" \
    --query 'properties.defaultHostName' --output tsv
}

main() {
  require_login

  if site_exists; then
    log "Site ${SITE_NAME} already exists — reapplying configuration only"
  else
    assert_hostname_available
  fi

  if resource_group_exists; then
    log "Resource group ${RESOURCE_GROUP} exists"
  else
    log "Creating resource group ${RESOURCE_GROUP} in ${LOCATION}"
    az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}" --output none
  fi

  if app_service_plan_exists; then
    log "App Service plan ${APP_SERVICE_PLAN} exists"
  else
    # Azure allows one free (F1) plan per region per subscription.
    log "Creating ${SKU} Linux App Service plan ${APP_SERVICE_PLAN}"
    az appservice plan create \
      --name "${APP_SERVICE_PLAN}" \
      --resource-group "${RESOURCE_GROUP}" \
      --location "${LOCATION}" \
      --sku "${SKU}" \
      --is-linux \
      --output none
  fi

  if ! site_exists; then
    # No --https-only here: `az webapp create` does not accept it, and the
    # update below applies it once the site exists.
    log "Creating web app ${SITE_NAME} on ${NODE_RUNTIME}"
    # `|| true` guards the same broken-XML path: on an affected CLI this command
    # creates the site and *then* fails resolving the FTP URL. The explicit
    # site_exists check below is what actually decides success.
    az webapp create \
      --name "${SITE_NAME}" \
      --resource-group "${RESOURCE_GROUP}" \
      --plan "${APP_SERVICE_PLAN}" \
      --runtime "${NODE_RUNTIME}" \
      --output none || true

    if ! site_exists; then
      echo "Failed to create site ${SITE_NAME}." >&2
      exit 1
    fi
  fi

  log "Applying app settings"
  # SCM_DO_BUILD_DURING_DEPLOYMENT=false is the load-bearing one: CI ships an
  # already-built standalone bundle, and letting Oryx rebuild on the host would
  # re-run `npm install` against GitHub Packages with no token and fail.
  az webapp config appsettings set \
    --name "${SITE_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --settings \
      NODE_ENV=production \
      SCM_DO_BUILD_DURING_DEPLOYMENT=false \
    --output none

  log "Setting startup command to '${STARTUP_COMMAND}'"
  az webapp config set \
    --name "${SITE_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --startup-file "${STARTUP_COMMAND}" \
    --output none

  log "Forcing HTTPS"
  az webapp update \
    --name "${SITE_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --https-only true \
    --output none

  # New App Service sites ship with SCM basic auth disabled in many tenants,
  # which makes a publish-profile deploy fail with a 401 that looks like a bad
  # secret. The GitHub Actions workflow authenticates this way, so enable it.
  log "Enabling SCM basic auth (publish-profile deploys)"
  az resource update \
    --resource-group "${RESOURCE_GROUP}" \
    --namespace Microsoft.Web \
    --resource-type basicPublishingCredentialsPolicies \
    --name scm \
    --parent "sites/${SITE_NAME}" \
    --set properties.allow=true \
    --output none

  log "Streaming logs to the filesystem (view with: az webapp log tail ...)"
  az webapp log config \
    --name "${SITE_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --application-logging filesystem \
    --docker-container-logging filesystem \
    --level information \
    --output none

  cat <<SUMMARY

$(printf '\033[1mProvisioned\033[0m')

  URL             https://$(site_hostname)
  Resource group  ${RESOURCE_GROUP}
  Plan            ${APP_SERVICE_PLAN} (${SKU}, Linux)
  Runtime         ${NODE_RUNTIME}

Next: store the publish profile as the GitHub secret AZURE_WEBAPP_PUBLISH_PROFILE.

  az webapp deployment list-publishing-profiles \\
    --name ${SITE_NAME} --resource-group ${RESOURCE_GROUP} --xml |
    gh secret set AZURE_WEBAPP_PUBLISH_PROFILE --repo Navanta-AI/shaw-mfg

Then push to main, or run: gh workflow run deploy-azure-app-service.yml
SUMMARY
}

main "$@"
