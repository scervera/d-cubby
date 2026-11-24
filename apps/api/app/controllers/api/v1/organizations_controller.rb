module Api
  module V1
    # The organization's own settings (stored in the database, unlike .env settings).
    class OrganizationsController < BaseController
      before_action :require_admin!, only: :update

      # GET /api/v1/organization
      def show = render_success(organization: OrganizationPresenter.call(Current.tenant))

      # PATCH /api/v1/organization (JSON, or multipart with a logo file)
      #   { organization: { name, default_locale, retention_days, logo, remove_logo } }
      def update
        org = Current.tenant
        attrs = params.require(:organization).permit(:name, :default_locale, :retention_days, :logo, :remove_logo)
        org.logo.purge_later if ActiveModel::Type::Boolean.new.cast(attrs.delete(:remove_logo))
        return render_validation_errors(org) unless org.update(attrs)

        render_success(organization: OrganizationPresenter.call(org))
      end
    end
  end
end
