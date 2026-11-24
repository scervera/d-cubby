module UserPresenter
  module_function

  def call(user, admin_view: false)
    json = {
      id: user.id, name: user.name, email: user.email, role: user.role, locale: user.locale,
      password_change_required: user.password_change_required,
      permissions: { admin: user.admin?, owner: user.owner?, write: user.dam_writer?,
                     assignable_roles: user.assignable_roles }
    }
    json.merge!(disabled: user.disabled?, last_sign_in_at: user.last_sign_in_at, created_at: user.created_at) if admin_view
    json
  end

  def summary(user) = { id: user.id, name: user.name, email: user.email }
end
