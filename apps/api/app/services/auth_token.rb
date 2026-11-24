# Signed (HS256) access tokens. A token is rejected when it has expired, was revoked by
# logout, or was issued before the user's password changed or the account was disabled
# (token_version).
module AuthToken
  ALGORITHM = "HS256"

  module_function

  def issue(user)
    now = Time.current
    payload = { sub: user.id, ver: user.token_version, jti: SecureRandom.uuid, iat: now.to_i, exp: (now + ttl).to_i }
    JWT.encode(payload, secret, ALGORITHM)
  end

  # The active user the token belongs to, or nil.
  def authenticate(token)
    payload = decode(token)
    return unless payload
    return if RevokedToken.revoked?(payload["jti"])

    user = User.find_by(id: payload["sub"])
    user if user && !user.disabled? && user.token_version == payload["ver"]
  end

  def revoke(token)
    payload = decode(token)
    return unless payload

    RevokedToken.insert({ jti: payload["jti"], expires_at: Time.zone.at(payload["exp"]), created_at: Time.current },
                        unique_by: :jti)
  end

  def decode(token)
    return if token.blank?

    JWT.decode(token, secret, true, algorithm: ALGORITHM, required_claims: %w[sub ver jti exp]).first
  rescue JWT::DecodeError
    nil
  end

  def ttl = ENV.fetch("JWT_TTL_HOURS", "24").to_i.hours

  def secret = ENV["JWT_SECRET_KEY"].presence || Rails.application.secret_key_base
end
