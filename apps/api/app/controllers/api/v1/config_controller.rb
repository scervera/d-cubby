module Api
  module V1
    # Settings the web app needs to render. Public parts are what the sign-in and setup
    # pages need; feature flags are added for signed-in users. Never includes secrets.
    class ConfigController < BaseController
      skip_before_action :authenticate_user!
      before_action :authenticate_user_if_present

      def show
        org = Organization.current
        config = {
          app_version: DCubby::VERSION,
          setup_needed: !User.exists?,
          organization: org && OrganizationPresenter.public(org),
          password_reset_by_email: Integrations.smtp_enabled?
        }
        if current_user
          ai = Integrations.ai_status
          config.merge!(
            max_file_size_gb: ENV["DAM_MAX_FILE_SIZE_GB"].presence&.to_f,
            ai_tagging_enabled: ai[:configured],
            ai_provider: ai[:provider],
            face_detection_enabled: Dam.face_detection_enabled?,
            smtp_enabled: Integrations.smtp_enabled?
          )
        end
        render_success(config)
      end
    end
  end
end
