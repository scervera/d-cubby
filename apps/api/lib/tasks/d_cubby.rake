# Live checks of the .env integrations, used by install.sh and `./install.sh --check`:
#   bin/rails d_cubby:check:storage
#   bin/rails d_cubby:check:smtp TO=you@example.com
#   bin/rails d_cubby:check:ai
#   bin/rails d_cubby:check:faces
#   bin/rails d_cubby:check:all          # skips integrations that are not configured
# Exit status is non-zero when a check fails.
namespace :d_cubby do
  namespace :check do
    run = lambda do |name, **options|
      result = name == "smtp" ? Integrations::SmtpCheck.new(**options).call : Integrations.check(name)
      puts "#{result.ok ? 'OK  ' : 'FAIL'} #{name}: #{result.message}"
      result.ok
    end

    task storage: :environment do
      exit 1 unless run.call("storage")
    end

    task smtp: :environment do
      exit 1 unless run.call("smtp", to: ENV["TO"])
    end

    task ai: :environment do
      exit 1 unless run.call("ai")
    end

    task faces: :environment do
      exit 1 unless run.call("faces")
    end

    task all: :environment do
      status = Integrations.status
      results = Integrations::NAMES.map do |name|
        next true unless status[name.to_sym][:configured]
        next(puts("SKIP smtp: set TO=address to send a test email") || true) if name == "smtp" && ENV["TO"].blank?

        run.call(name, **(name == "smtp" ? { to: ENV["TO"] } : {}))
      end
      exit 1 unless results.all?
    end
  end
end
