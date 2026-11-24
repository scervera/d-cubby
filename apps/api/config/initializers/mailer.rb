# SMTP settings from .env (written by install.sh). Without SMTP_HOST, mail isn't sent
# (invitations fall back to temporary passwords; password reset by email is off).
ActiveSupport.on_load(:action_mailer) do
  if ENV["SMTP_HOST"].present? && !Rails.env.test?
    port = ENV.fetch("SMTP_PORT", 587).to_i
    # SMTP_TLS: "tls" (implicit TLS, usually port 465), "starttls" (default) or "none".
    tls_mode = ENV.fetch("SMTP_TLS") { port == 465 ? "tls" : "starttls" }
    self.delivery_method = :smtp
    self.smtp_settings = {
      address: ENV["SMTP_HOST"],
      port: port,
      domain: ENV["SMTP_DOMAIN"].presence,
      user_name: ENV["SMTP_USERNAME"].presence,
      password: ENV["SMTP_PASSWORD"].presence,
      authentication: ENV["SMTP_USERNAME"].present? ? :plain : nil,
      tls: tls_mode == "tls",
      enable_starttls_auto: tls_mode == "starttls",
      open_timeout: 15,
      read_timeout: 30
    }.compact
    # Failures must surface: the SMTP check reports them and mail jobs retry.
    self.raise_delivery_errors = true
  end
  if ENV["APP_URL"].present?
    uri = URI.parse(ENV["APP_URL"])
    self.default_url_options = { host: uri.host, protocol: uri.scheme, port: uri.port }.compact
  end
  self.default_options = { from: ENV.fetch("SMTP_FROM", "D-cubby <noreply@localhost>") }
end
