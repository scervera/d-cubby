module Integrations
  # Sends a test email (to `to`, or the signed-in user).
  class SmtpCheck
    def initialize(to: nil)
      @to = to || Current.user&.email
    end

    def call
      return Result.new(ok: false, message: "SMTP is not configured (SMTP_HOST is empty)") unless Integrations.smtp_enabled?
      return Result.new(ok: false, message: "No recipient for the test email") if @to.blank?

      SystemMailer.test_email(@to).deliver_now
      Result.new(ok: true, message: "Sent a test email to #{@to}")
    end
  end
end
