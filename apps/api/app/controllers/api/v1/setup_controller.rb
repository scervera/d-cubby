module Api
  module V1
    # First-run setup: creates the organization and the owner account. Accepted only while
    # no user exists, and only with the one-time SETUP_TOKEN that install.sh printed.
    class SetupController < BaseController
      LOCK_KEY = 4_242_001
      class SetupComplete < StandardError; end

      skip_before_action :authenticate_user!

      rate_limit to: 10, within: 5.minutes, only: :create,
                 with: -> { render_error("Too many attempts. Try again in a few minutes.", :too_many_requests) }

      # GET /api/v1/setup
      def show
        render_success(needed: setup_needed?)
      end

      # POST /api/v1/setup
      #   { setup_token, organization: { name, default_locale, retention_days },
      #     user: { name, email, password } }
      def create
        return render_error("Setup is already complete", :gone) unless setup_needed?
        return render_error("Invalid setup token", :forbidden) unless valid_setup_token?

        owner = nil
        ActiveRecord::Base.transaction do
          # Serialize concurrent setups; the second one sees the first owner and stops.
          ActiveRecord::Base.connection.execute("SELECT pg_advisory_xact_lock(#{LOCK_KEY})")
          raise SetupComplete if User.exists?

          org = Organization.create!(organization_params)
          owner = org.users.create!(user_params.merge(role: "owner"))
        end

        render_success({ token: AuthToken.issue(owner), user: UserPresenter.call(owner) }, :created)
      rescue SetupComplete
        render_error("Setup is already complete", :gone)
      rescue ActiveRecord::RecordInvalid => e
        render_validation_errors(e.record)
      end

      private

      def setup_needed? = !User.exists?

      def valid_setup_token?
        expected = ENV["SETUP_TOKEN"].to_s
        given = params[:setup_token].to_s
        expected.present? && ActiveSupport::SecurityUtils.secure_compare(expected, given)
      end

      def organization_params = params.require(:organization).permit(:name, :default_locale, :retention_days)
      def user_params = params.require(:user).permit(:name, :email, :password)
    end
  end
end
