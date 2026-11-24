require "rails_helper"

RSpec.describe "Users", type: :request do
  let!(:owner) { create_user(role: "owner") }
  let(:admin) { create_user(role: "admin") }
  let(:editor) { create_user(role: "editor") }

  describe "inviting" do
    let(:invite) { { user: { name: "New Person", email: "new@example.com", role: "viewer" } } }

    it "returns a one-time temporary password when SMTP is off" do
      with_env("SMTP_HOST" => nil) { post "/api/v1/users", params: invite, headers: auth_headers(admin), as: :json }

      expect(response).to have_http_status(:created)
      expect(json).to include("invitation_sent" => false, "temporary_password" => be_present)
      new_user = User.find_by(email: "new@example.com")
      expect(new_user.authenticate(json["temporary_password"])).to be_truthy
      expect(new_user.password_change_required).to be(true)
    end

    it "emails an invitation when SMTP is on" do
      with_env("SMTP_HOST" => "smtp.example.com") do
        expect { post "/api/v1/users", params: invite, headers: auth_headers(admin), as: :json }
          .to have_enqueued_mail(UserMailer, :invitation)
      end
      expect(json).to include("invitation_sent" => true)
      expect(json).not_to have_key("temporary_password")
    end

    it "is for owners and admins only, within the roles they may grant" do
      post "/api/v1/users", params: invite, headers: auth_headers(editor), as: :json
      expect(response).to have_http_status(:forbidden)

      post "/api/v1/users", params: invite.deep_merge(user: { role: "admin" }), headers: auth_headers(admin), as: :json
      expect(response).to have_http_status(:forbidden)

      post "/api/v1/users", params: invite.deep_merge(user: { role: "owner" }), headers: auth_headers(owner), as: :json
      expect(response).to have_http_status(:forbidden)

      post "/api/v1/users", params: invite.deep_merge(user: { role: "admin" }), headers: auth_headers(owner), as: :json
      expect(response).to have_http_status(:created)
    end
  end

  describe "managing" do
    it "lets admins change roles and disable editors and viewers" do
      patch "/api/v1/users/#{editor.id}", params: { user: { role: "viewer", disabled: true } },
                                          headers: auth_headers(admin), as: :json

      expect(response).to have_http_status(:ok)
      expect(editor.reload).to have_attributes(role: "viewer", disabled?: true)
    end

    it "protects the owner, other admins and yourself" do
      other_admin = create_user(role: "admin")
      [ owner, other_admin, admin ].each do |target|
        patch "/api/v1/users/#{target.id}", params: { user: { disabled: true } }, headers: auth_headers(admin), as: :json
        expect(response).to have_http_status(:forbidden), "admin should not manage #{target.role} #{target.id}"
      end

      patch "/api/v1/users/#{other_admin.id}", params: { user: { role: "editor" } }, headers: auth_headers(owner), as: :json
      expect(response).to have_http_status(:ok)
    end

    it "resets a password to a temporary one" do
      post "/api/v1/users/#{editor.id}/reset_password", headers: auth_headers(admin)

      expect(editor.reload.authenticate(json["temporary_password"])).to be_truthy
      expect(editor.password_change_required).to be(true)
    end
  end

  it "lists active users for everyone, with details only for admins" do
    create_user(role: "viewer", disabled_at: Time.current)

    get "/api/v1/users", headers: auth_headers(editor)
    expect(json["users"].size).to eq(2)
    expect(json["users"].first.keys).to contain_exactly("id", "name", "email")

    get "/api/v1/users", headers: auth_headers(admin)
    expect(json["users"].size).to eq(4)
    expect(json["users"].first).to include("role", "disabled")
  end

  describe "own profile" do
    it "needs the current password to change the password, and returns a fresh token" do
      patch "/api/v1/users/me", params: { user: { password: "a-new-long-password" } }, headers: auth_headers(editor), as: :json
      expect(response).to have_http_status(:unprocessable_content)

      patch "/api/v1/users/me", params: { user: { password: "a-new-long-password" }, current_password: DCubbySpecHelpers::PASSWORD },
                                headers: auth_headers(editor), as: :json
      expect(response).to have_http_status(:ok)
      expect(AuthToken.authenticate(json["token"])).to eq(editor)
    end

    it "cannot change its own role" do
      patch "/api/v1/users/me", params: { user: { role: "admin", name: "Ed" } }, headers: auth_headers(editor), as: :json
      expect(editor.reload).to have_attributes(role: "editor", name: "Ed")
    end
  end
end
