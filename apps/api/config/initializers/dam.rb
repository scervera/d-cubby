# Connects the dam gem to D-cubby. Every setting is described in the gem's
# lib/dam/configuration.rb.

# Asset URLs in API responses are absolute; they point at the public address (Caddy, or
# the Next.js dev server, which proxies /rails/active_storage to Rails).
ENV["ACTIVE_STORAGE_HOST"] ||= ENV["APP_URL"].presence&.chomp("/")

Dam.configure do |config|
  config.tenant_class = "Organization"
  config.user_class = "User"
  config.parent_controller = "Api::V1::BaseController"

  config.current_tenant = -> { Current.tenant }
  config.set_current_tenant = ->(tenant) { Current.tenant = tenant }
  config.current_user = -> { Current.user }
  config.set_current_user = ->(user) { Current.user = user }

  # GET /assets/:id/stream?token=... (<video> elements can't send headers).
  config.authenticate_token = ->(token) { AuthToken.authenticate(token) }
  config.tenant_for_request = ->(user, _request) { user.organization }

  config.find_tenant_user = ->(tenant, user_id) { tenant.users.active.find(user_id) }
  # Watched-folder imports belong to the owner.
  config.import_user_for = ->(tenant) { tenant.owner || tenant.users.active.order(:id).first }

  config.soft_delete_enabled = -> { true }
  config.asset_retention_days = -> { Organization.current&.retention_days || 30 }

  config.serialize_user = ->(user) { { id: user.id, name: user.name, email: user.email } }
  config.serialize_tenant = ->(org) { { id: org.id, name: org.name } }

  # Solid Queue runs Dam::WatchedFolderSchedulerJob from config/recurring.yml.
  config.watched_folder_scheduler = :external
  # Watched folders may only read inside these directories (comma-separated). In Docker,
  # host folders are mounted under /watched (see docker-compose.yml).
  config.watched_folder_roots =
    ENV.fetch("WATCHED_FOLDER_ROOTS") { Rails.env.production? ? "/watched" : "" }.split(",").map(&:strip).reject(&:empty?).presence

  # AI auto-tagging is configured in .env: DAM_AI_PROVIDER (openai, anthropic or
  # openai_compatible), DAM_AI_MODEL, DAM_AI_API_KEY, DAM_AI_BASE_URL.
end
