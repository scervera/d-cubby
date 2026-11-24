require "rails_helper"

RSpec.describe "Authentication", type: :request do
  let!(:user) { create_user(role: "editor", email: "ed@example.com") }

  it "signs in with email and password" do
    post "/api/v1/auth/login", params: { email: " ED@example.com ", password: DCubbySpecHelpers::PASSWORD }, as: :json

    expect(response).to have_http_status(:ok)
    expect(json["user"]).to include("email" => "ed@example.com", "role" => "editor")
    get "/api/v1/users/me", headers: { "Authorization" => "Bearer #{json['token']}" }
    expect(response).to have_http_status(:ok)
  end

  it "rejects a wrong password and disabled users" do
    post "/api/v1/auth/login", params: { email: "ed@example.com", password: "nope" }, as: :json
    expect(response).to have_http_status(:unauthorized)

    user.disable!
    post "/api/v1/auth/login", params: { email: "ed@example.com", password: DCubbySpecHelpers::PASSWORD }, as: :json
    expect(response).to have_http_status(:unauthorized)
  end

  it "requires a token for API calls, including the DAM's" do
    get "/api/v1/users/me"
    expect(response).to have_http_status(:unauthorized)
    get "/api/v1/assets"
    expect(response).to have_http_status(:unauthorized)
  end

  it "revokes the token on logout" do
    headers = auth_headers(user)
    delete "/api/v1/auth/logout", headers: headers
    expect(response).to have_http_status(:no_content)

    get "/api/v1/users/me", headers: headers
    expect(response).to have_http_status(:unauthorized)
  end

  it "rejects existing tokens once the user is disabled or changes password" do
    headers = auth_headers(user)
    user.update!(password: "a-new-long-password")
    get "/api/v1/users/me", headers: headers
    expect(response).to have_http_status(:unauthorized)

    headers = auth_headers(user.reload)
    user.disable!
    get "/api/v1/users/me", headers: headers
    expect(response).to have_http_status(:unauthorized)
  end

  it "rejects expired and tampered tokens" do
    token = AuthToken.issue(user)
    travel_to(25.hours.from_now) { expect(AuthToken.authenticate(token)).to be_nil }
    expect(AuthToken.authenticate("#{token}x")).to be_nil
  end

  describe "password reset" do
    it "is unavailable without SMTP" do
      with_env("SMTP_HOST" => nil) { post "/api/v1/auth/password/forgot", params: { email: "ed@example.com" }, as: :json }
      expect(response).to have_http_status(:service_unavailable)
    end

    it "emails a link without revealing whether the account exists" do
      with_env("SMTP_HOST" => "smtp.example.com") do
        expect { post "/api/v1/auth/password/forgot", params: { email: "ed@example.com" }, as: :json }
          .to have_enqueued_mail(UserMailer, :password_reset)
        expect(response).to have_http_status(:accepted)

        expect { post "/api/v1/auth/password/forgot", params: { email: "nobody@example.com" }, as: :json }
          .not_to have_enqueued_mail
        expect(response).to have_http_status(:accepted)
      end
    end

    it "sets a new password with a valid token, once" do
      token = user.generate_token_for(:password_reset)
      post "/api/v1/auth/password/reset", params: { token: token, password: "brand-new-password" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(user.reload.authenticate("brand-new-password")).to be_truthy

      post "/api/v1/auth/password/reset", params: { token: token, password: "another-password" }, as: :json
      expect(response).to have_http_status(:unprocessable_content)
    end
  end
end
