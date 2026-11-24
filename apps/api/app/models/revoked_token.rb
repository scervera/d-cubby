# JWT ids revoked by logout. Rows past expires_at are deleted by a recurring job.
class RevokedToken < ApplicationRecord
  scope :expired, -> { where(expires_at: ...Time.current) }

  def self.revoked?(jti) = exists?(jti: jti)
end
