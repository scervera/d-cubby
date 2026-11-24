require "rails_helper"

RSpec.describe "First-run setup", type: :request do
  let(:payload) do
    { setup_token: "s3cret-setup",
      organization: { name: "Acme Media", default_locale: "es", retention_days: 14 },
      user: { name: "Olive Owner", email: "Olive@Example.com", password: "correct-horse-battery" } }
  end

  around { |example| with_env("SETUP_TOKEN" => "s3cret-setup") { example.run } }

  it "reports that setup is needed until a user exists" do
    get "/api/v1/setup"
    expect(json).to eq("needed" => true)
  end

  it "creates the organization and owner and signs the owner in" do
    post "/api/v1/setup", params: payload, as: :json

    expect(response).to have_http_status(:created)
    owner = User.sole
    expect(owner).to have_attributes(role: "owner", email: "olive@example.com")
    expect(Organization.current).to have_attributes(name: "Acme Media", default_locale: "es", retention_days: 14)
    expect(AuthToken.authenticate(json["token"])).to eq(owner)
  end

  it "runs only once" do
    post "/api/v1/setup", params: payload, as: :json
    post "/api/v1/setup", params: payload.deep_merge(user: { email: "mallory@example.com" }), as: :json

    expect(response).to have_http_status(:gone)
    expect(User.count).to eq(1)
    get "/api/v1/setup"
    expect(json).to eq("needed" => false)
  end

  it "requires the setup token" do
    post "/api/v1/setup", params: payload.merge(setup_token: "guess"), as: :json
    expect(response).to have_http_status(:forbidden)

    post "/api/v1/setup", params: payload.except(:setup_token), as: :json
    expect(response).to have_http_status(:forbidden)
    expect(User.count).to eq(0)
  end

  it "is closed when no SETUP_TOKEN is configured" do
    with_env("SETUP_TOKEN" => nil) do
      post "/api/v1/setup", params: payload.merge(setup_token: ""), as: :json
    end
    expect(response).to have_http_status(:forbidden)
  end

  it "rolls back when the owner is invalid" do
    post "/api/v1/setup", params: payload.deep_merge(user: { password: "short" }), as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(Organization.count).to eq(0)
  end
end
