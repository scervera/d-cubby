class UserMailer < ApplicationMailer
  def password_reset(user)
    @user = user
    @url = app_url("/reset-password", token: user.generate_token_for(:password_reset))
    mail(to: user.email, subject: "Reset your D-cubby password")
  end

  def invitation(user, invited_by)
    @user = user
    @invited_by = invited_by
    @org_name = user.organization.name
    @url = app_url("/accept-invite", token: user.generate_token_for(:invitation))
    mail(to: user.email, subject: "You're invited to #{@org_name} on D-cubby")
  end

  private

  def app_url(path, params)
    "#{ENV.fetch('APP_URL', 'http://localhost:4080').chomp('/')}#{path}?#{params.to_query}"
  end
end
