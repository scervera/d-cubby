# Answers GET /health before anything else in the stack (including ActionDispatch::SSL),
# so the Docker Compose healthcheck and install.sh never get a force_ssl redirect and
# never touch routing or authentication.
class HealthMiddleware
  PATH = "/health".freeze

  def initialize(app)
    @app = app
  end

  def call(env)
    return @app.call(env) unless env["PATH_INFO"] == PATH

    body = %({"status":"ok","time":"#{Time.now.utc.iso8601}"})
    [ 200, { "content-type" => "application/json", "cache-control" => "no-store" }, [ body ] ]
  end
end

Rails.application.config.middleware.insert_before 0, HealthMiddleware
