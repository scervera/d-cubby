module OrganizationPresenter
  module_function

  def call(org)
    public(org).merge(retention_days: org.retention_days)
  end

  # Shown on the sign-in page. The logo URL is relative: the app is served from one origin.
  def public(org)
    logo = Rails.application.routes.url_helpers.rails_blob_path(org.logo, only_path: true) if org.logo.attached?
    { name: org.name, default_locale: org.default_locale, logo_url: logo }
  end
end
