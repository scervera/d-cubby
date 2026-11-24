require "rails_helper"

RSpec.describe "Organization, config and system status", type: :request do
  let!(:owner) { create_user(role: "owner") }
  let(:viewer) { create_user(role: "viewer") }

  SECRETS = {
    "DAM_AI_PROVIDER" => "anthropic", "DAM_AI_API_KEY" => "sk-ant-SECRET-KEY",
    "SMTP_HOST" => "smtp.example.com", "SMTP_PASSWORD" => "smtp-SECRET-pass",
    "STORAGE_PROVIDER" => "s3", "S3_BUCKET" => "acme-assets", "S3_SECRET_ACCESS_KEY" => "s3-SECRET-key",
    "S3_ACCESS_KEY_ID" => "AKIA-SECRET-ID", "SETUP_TOKEN" => "setup-SECRET-token", "JWT_SECRET_KEY" => "jwt-SECRET"
  }.freeze

  it "updates organization settings (admins only)" do
    patch "/api/v1/organization", params: { organization: { name: "Acme Studio", retention_days: 60 } },
                                  headers: auth_headers(viewer), as: :json
    expect(response).to have_http_status(:forbidden)

    patch "/api/v1/organization", params: { organization: { name: "Acme Studio", retention_days: 60 } },
                                  headers: auth_headers(owner), as: :json
    expect(json["organization"]).to include("name" => "Acme Studio", "retention_days" => 60)
    expect(Dam.config.asset_retention_days.call).to eq(60)
  end

  it "accepts a logo upload and serves it from a relative URL" do
    patch "/api/v1/organization", params: { organization: { logo: fixture_file_upload("sample.png", "image/png") } },
                                  headers: auth_headers(owner)

    expect(response).to have_http_status(:ok)
    expect(json.dig("organization", "logo_url")).to start_with("/rails/active_storage/")
  end

  it "gives signed-out visitors only what the sign-in page needs" do
    with_env(SECRETS) { get "/api/v1/config" }

    expect(json).to include("setup_needed" => false, "password_reset_by_email" => true)
    expect(json["organization"]).to include("name" => "Acme Media")
    expect(json).not_to have_key("ai_provider")
  end

  it "adds feature flags for signed-in users" do
    with_env(SECRETS.merge("DAM_MAX_FILE_SIZE_GB" => "5")) { get "/api/v1/config", headers: auth_headers(viewer) }

    expect(json).to include("ai_tagging_enabled" => true, "ai_provider" => "anthropic", "max_file_size_gb" => 5.0)
  end

  it "shows integration status to admins without any secret values" do
    with_env(SECRETS) { get "/api/v1/system/status", headers: auth_headers(owner) }

    expect(response).to have_http_status(:ok)
    expect(json.dig("integrations", "storage")).to include("provider" => "s3", "bucket" => "acme-assets")
    expect(json.dig("integrations", "ai")).to include("configured" => true, "provider" => "anthropic")
    expect(response.body).not_to include("SECRET")

    with_env(SECRETS) { get "/api/v1/config", headers: auth_headers(owner) }
    expect(response.body).not_to include("SECRET")
  end

  it "keeps system status from non-admins" do
    get "/api/v1/system/status", headers: auth_headers(viewer)
    expect(response).to have_http_status(:forbidden)
  end

  it "runs a live storage check" do
    post "/api/v1/system/checks/storage", headers: auth_headers(owner)

    expect(json["result"]).to include("ok" => true)
  end

  it "reports unconfigured integrations as failed checks" do
    with_env("DAM_AI_PROVIDER" => nil, "DAM_AI_API_KEY" => nil, "OPENAI_API_KEY" => nil, "ANTHROPIC_API_KEY" => nil) do
      post "/api/v1/system/checks/ai", headers: auth_headers(owner)
    end
    expect(json["result"]).to include("ok" => false, "message" => /not configured/)

    post "/api/v1/system/checks/nope", headers: auth_headers(owner)
    expect(response).to have_http_status(:not_found)
  end

  it "sends a test email" do
    with_env("SMTP_HOST" => "smtp.example.com") do
      expect { post "/api/v1/system/checks/smtp", headers: auth_headers(owner) }
        .to change { ActionMailer::Base.deliveries.size }.by(1)
    end
    expect(ActionMailer::Base.deliveries.last.to).to eq([ owner.email ])
  end
end
