require "webmock/rspec"

module DCubbySpecHelpers
  PASSWORD = "correct-horse-battery".freeze

  def organization
    @organization ||= Organization.first || Organization.create!(name: "Acme Media")
  end

  def create_user(role: "editor", email: nil, **attrs)
    organization.users.create!(name: "#{role.capitalize} User", email: email || "#{role}-#{SecureRandom.hex(3)}@example.com",
                               password: PASSWORD, role: role, **attrs)
  end

  def auth_headers(user) = { "Authorization" => "Bearer #{AuthToken.issue(user)}" }

  def json = JSON.parse(response.body)

  def with_env(values)
    previous = values.keys.to_h { |key| [ key, ENV[key] ] }
    values.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
    yield
  ensure
    previous.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end
end

RSpec.configure do |config|
  config.include DCubbySpecHelpers
  config.include ActiveJob::TestHelper
  config.include ActiveSupport::Testing::TimeHelpers
  config.after { Current.reset }
  WebMock.disable_net_connect!(allow_localhost: true)
end
