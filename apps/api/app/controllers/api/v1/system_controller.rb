module Api
  module V1
    # Read-only status of the .env integrations, with live tests. Changes are made with
    # `./install.sh --reconfigure`, never here.
    class SystemController < BaseController
      before_action :require_admin!

      rate_limit to: 10, within: 1.minute, only: :check,
                 with: -> { render_error("Too many checks. Wait a minute.", :too_many_requests) }

      # GET /api/v1/system/status
      def status
        render_success(app_version: DCubby::VERSION, integrations: Integrations.status)
      end

      # POST /api/v1/system/checks/:name   (storage | smtp | ai | faces)
      def check
        name = params[:name].to_s
        return render_error("Unknown check", :not_found) unless Integrations::NAMES.include?(name)

        render_success(name: name, result: Integrations.check(name).as_json)
      end
    end
  end
end
