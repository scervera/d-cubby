module Api
  module V1
    # Sign in and out, password reset, and accepting an invitation.
    class AuthController < BaseController
      skip_before_action :authenticate_user!, except: :logout

      rate_limit to: 10, within: 3.minutes, only: :login, with: -> { too_many_requests }
      rate_limit to: 5, within: 15.minutes, only: :forgot_password, with: -> { too_many_requests }

      # POST /api/v1/auth/login { email, password }
      def login
        user = User.find_by(email: params.require(:email).to_s.strip.downcase)
        unless user&.authenticate(params.require(:password).to_s) && !user.disabled?
          return render_error("Invalid email or password", :unauthorized)
        end

        user.update_column(:last_sign_in_at, Time.current)
        render_success(token: AuthToken.issue(user), user: UserPresenter.call(user))
      end

      # DELETE /api/v1/auth/logout
      def logout
        AuthToken.revoke(bearer_token)
        head :no_content
      end

      # POST /api/v1/auth/password/forgot { email }
      # Always 202 so the response does not reveal which emails have accounts.
      def forgot_password
        unless Integrations.smtp_enabled?
          return render_error("Email is not set up on this server. Ask an administrator to reset your password.",
                              :service_unavailable)
        end

        user = User.active.find_by(email: params.require(:email).to_s.strip.downcase)
        UserMailer.password_reset(user).deliver_later if user
        head :accepted
      end

      # POST /api/v1/auth/password/reset { token, password }
      def reset_password = set_password_with(:password_reset)

      # POST /api/v1/auth/invitation/accept { token, password }
      def accept_invitation = set_password_with(:invitation)

      private

      def set_password_with(purpose)
        user = User.find_by_token_for(purpose, params.require(:token).to_s)
        return render_error("This link is invalid or has expired", :unprocessable_content) if user.nil? || user.disabled?

        if user.update(password: params.require(:password).to_s, password_change_required: false)
          render_success(token: AuthToken.issue(user), user: UserPresenter.call(user))
        else
          render_validation_errors(user)
        end
      end

      def too_many_requests = render_error("Too many attempts. Try again in a few minutes.", :too_many_requests)
    end
  end
end
