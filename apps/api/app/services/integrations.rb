# Read-only view of the infrastructure settings in .env (written by install.sh), and live
# checks for each. Shared by GET /api/v1/system/status, POST /api/v1/system/checks/:name
# and `bin/rails d_cubby:check:<name>`.
#
# Statuses never include secrets: only whether something is configured, plus a provider
# or host name.
module Integrations
  NAMES = %w[storage smtp ai faces].freeze

  Result = Struct.new(:ok, :message, keyword_init: true) do
    def as_json(*) = { ok: ok, message: message }
  end

  module_function

  def status
    {
      storage: storage_status,
      smtp: smtp_status,
      ai: ai_status,
      faces: faces_status
    }
  end

  def check(name)
    raise ArgumentError, "unknown check #{name}" unless NAMES.include?(name.to_s)

    "Integrations::#{name.to_s.camelize}Check".constantize.new.call
  rescue ArgumentError
    raise
  rescue StandardError => e
    Result.new(ok: false, message: "#{e.class}: #{e.message}")
  end

  def storage_provider = ENV.fetch("STORAGE_PROVIDER", "local")

  def smtp_enabled? = ENV["SMTP_HOST"].present?

  def storage_status
    if storage_provider == "s3"
      { configured: ENV["S3_BUCKET"].present?, provider: "s3", bucket: ENV["S3_BUCKET"],
        endpoint: ENV["S3_ENDPOINT"].presence || "AWS S3", region: ENV["S3_REGION"] }
    else
      { configured: true, provider: "local" }
    end
  end

  def smtp_status
    { configured: smtp_enabled?, host: ENV["SMTP_HOST"].presence, port: ENV["SMTP_PORT"].presence&.to_i,
      from: ENV["SMTP_FROM"].presence }
  end

  def ai_status
    configured = Dam.ai_tagging_enabled?
    provider = Dam::Ai::Providers.current if configured
    { configured: configured, provider: provider&.name&.to_s, model: provider&.model }
  rescue Dam::Ai::Providers::ConfigurationError => e
    { configured: false, provider: nil, model: nil, error: e.message }
  end

  def faces_status
    { configured: Dam.face_detection_enabled?, provider: Dam.face_detection_enabled? ? "aws_rekognition" : nil,
      region: (ENV.fetch("AWS_REGION", "us-east-1") if Dam.face_detection_enabled?) }
  end
end
