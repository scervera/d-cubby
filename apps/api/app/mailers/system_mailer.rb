class SystemMailer < ApplicationMailer
  def test_email(to)
    @org_name = Organization.current&.name || "D-cubby"
    mail(to: to, subject: "D-cubby test email")
  end
end
