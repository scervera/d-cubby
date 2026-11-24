# Parent of every API controller, including the dam gem's (Dam.config.parent_controller).
# Provides the gem's contract: authenticate_user!, current_user, tenant_scope,
# render_success and render_error.
module Api
  module V1
    class BaseController < ActionController::API
      include Pundit::Authorization

      before_action :authenticate_user!

      rescue_from(Pundit::NotAuthorizedError) { render_error("Forbidden", :forbidden) }
      rescue_from(ActiveRecord::RecordNotFound) { render_error("Not found", :not_found) }
      rescue_from(ActionController::ParameterMissing) { |e| render_error(e.message, :bad_request) }

      def current_user = Current.user

      private

      def authenticate_user!
        user = AuthToken.authenticate(bearer_token)
        return render_error("Unauthorized", :unauthorized) unless user

        Current.user = user
        Current.tenant = user.organization
      end

      # For endpoints that work signed in or out.
      def authenticate_user_if_present
        user = AuthToken.authenticate(bearer_token)
        return unless user

        Current.user = user
        Current.tenant = user.organization
      end

      def bearer_token
        request.authorization.to_s[/\ABearer (.+)\z/, 1]
      end

      def require_admin!
        render_error("Forbidden", :forbidden) unless current_user&.admin?
      end

      # Single organization: every DAM row belongs to it. Never read it from the request.
      def tenant_scope(relation) = relation.where(tenant: Current.tenant)

      def render_success(data, status = :ok) = render(json: data, status: status)

      def render_error(message, status = :unprocessable_content, details: nil)
        render json: { error: message, details: details }.compact, status: status
      end

      def render_validation_errors(record)
        render_error(record.errors.full_messages.to_sentence, :unprocessable_content, details: record.errors.to_hash)
      end
    end
  end
end
