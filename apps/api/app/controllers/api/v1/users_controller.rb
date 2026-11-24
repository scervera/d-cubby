module Api
  module V1
    # The signed-in user's profile, and user management for owners and admins.
    class UsersController < BaseController
      before_action :require_admin!, only: %i[create update reset_password]
      before_action :load_managed_user, only: %i[update reset_password]

      # GET /api/v1/users/me
      def me = render_success(user: UserPresenter.call(current_user))

      # PATCH /api/v1/users/me { name, email, locale, password, current_password }
      def update_me
        attrs = params.require(:user).permit(:name, :email, :locale, :password)
        if (attrs.key?(:password) || attrs.key?(:email)) && !current_user.authenticate(params[:current_password].to_s)
          return render_error("Current password is incorrect", :unprocessable_content)
        end

        attrs[:password_change_required] = false if attrs.key?(:password)
        return render_validation_errors(current_user) unless current_user.update(attrs)

        # A password change revokes existing tokens, so hand back a fresh one.
        token = AuthToken.issue(current_user) if attrs.key?(:password)
        render_success({ user: UserPresenter.call(current_user), token: token }.compact)
      end

      # GET /api/v1/users — everyone can list active users (group and drop-zone pickers);
      # admins also see disabled users and roles.
      def index
        users = Current.tenant.users.order(:name)
        if current_user.admin?
          render_success(users: users.map { |u| UserPresenter.call(u, admin_view: true) })
        else
          render_success(users: users.active.map { |u| UserPresenter.summary(u) })
        end
      end

      # POST /api/v1/users { user: { name, email, role } }
      # Emails an invitation when SMTP is set up; otherwise returns a one-time temporary
      # password the admin passes on (the user must change it at first sign-in).
      def create
        attrs = params.require(:user).permit(:name, :email, :role)
        return render_error("You can't assign that role", :forbidden) unless attrs[:role].in?(current_user.assignable_roles)

        temporary_password = SecureRandom.alphanumeric(16)
        user = Current.tenant.users.new(attrs.merge(password: temporary_password, password_change_required: true))
        return render_validation_errors(user) unless user.save

        if Integrations.smtp_enabled?
          UserMailer.invitation(user, current_user).deliver_later
          render_success({ user: UserPresenter.call(user, admin_view: true), invitation_sent: true }, :created)
        else
          render_success({ user: UserPresenter.call(user, admin_view: true), invitation_sent: false,
                           temporary_password: temporary_password }, :created)
        end
      end

      # PATCH /api/v1/users/:id { user: { name, role, disabled } }
      def update
        attrs = params.require(:user).permit(:name, :role, :disabled)
        if attrs.key?(:role) && !attrs[:role].in?(current_user.assignable_roles)
          return render_error("You can't assign that role", :forbidden)
        end

        disabled = attrs.delete(:disabled)
        attrs[:disabled_at] = ActiveModel::Type::Boolean.new.cast(disabled) ? Time.current : nil unless disabled.nil?
        return render_validation_errors(@user) unless @user.update(attrs)

        render_success(user: UserPresenter.call(@user, admin_view: true))
      end

      # POST /api/v1/users/:id/reset_password — new temporary password (no SMTP needed).
      def reset_password
        temporary_password = SecureRandom.alphanumeric(16)
        @user.update!(password: temporary_password, password_change_required: true)
        render_success(user: UserPresenter.call(@user, admin_view: true), temporary_password: temporary_password)
      end

      private

      def load_managed_user
        @user = Current.tenant.users.find(params[:id])
        render_error("You can't change this user", :forbidden) unless current_user.can_manage?(@user)
      end
    end
  end
end
