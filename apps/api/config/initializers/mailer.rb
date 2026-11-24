# SMTP settings from env (.env). Without SMTP_HOST, Rails defaults apply.
ActiveSupport.on_load(:action_mailer) do
  if ENV["SMTP_HOST"].present? && !Rails.env.test?
    self.delivery_method = :smtp
    self.smtp_settings = {
      address: ENV["SMTP_HOST"],
      port: ENV.fetch("SMTP_PORT", 587).to_i,
      domain: ENV["SMTP_DOMAIN"],
      user_name: ENV["SMTP_USERNAME"],
      password: ENV["SMTP_PASSWORD"],
      authentication: ENV["SMTP_USERNAME"].present? ? :plain : nil,
      enable_starttls_auto: true
    }.compact
  end
  if ENV["APP_URL"].present?
    uri = URI.parse(ENV["APP_URL"])
    self.default_url_options = { host: uri.host, protocol: uri.scheme, port: uri.port }.compact
  end
  self.default_options = { from: ENV.fetch("SMTP_FROM", "noreply@localhost") }
end
