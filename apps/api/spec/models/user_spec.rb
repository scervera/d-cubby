require "rails_helper"

RSpec.describe User do
  it "allows a single owner" do
    create_user(role: "owner")
    expect { create_user(role: "owner") }.to raise_error(ActiveRecord::RecordNotUnique)
  end

  it "normalizes email and requires a long password" do
    user = organization.users.new(name: "A", email: " A@Example.COM ", password: "short", role: "viewer")
    expect(user).not_to be_valid
    expect(user.email).to eq("a@example.com")
    expect(user.errors[:password]).to be_present
  end

  it "allows only one organization" do
    organization
    expect(Organization.new(name: "Second")).not_to be_valid
  end
end
