# syntax=docker/dockerfile:1.7
# D-cubby API image. Also runs the Solid Queue worker (`bin/jobs`). Build context is the
# REPOSITORY ROOT:
#   docker build -f apps/api/Dockerfile --build-arg APP_VERSION=0.1.0 .

ARG RUBY_VERSION=3.4.13
FROM ruby:${RUBY_VERSION}-slim AS base

WORKDIR /rails

# Runtime packages:
#   libvips             thumbnails and previews (incl. HEIC/WebP)
#   ffmpeg              video posters and audio/video metadata
#   libimage-exiftool-perl  EXIF metadata
#   postgresql-client   pg_isready and pg_dump (backups)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      ca-certificates curl libjemalloc2 libvips ffmpeg libimage-exiftool-perl postgresql-client && \
    ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

ENV RAILS_ENV=production \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_WITHOUT="development:test" \
    RAILS_LOG_TO_STDOUT=1 \
    LD_PRELOAD=/usr/local/lib/libjemalloc.so

# ---------------------------------------------------------------------------
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Gems first for layer caching.
COPY apps/api/Gemfile apps/api/Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

COPY apps/api ./
RUN bundle exec bootsnap precompile app/ lib/

# ---------------------------------------------------------------------------
FROM base

ARG APP_VERSION=0.0.0-dev
ENV APP_VERSION=${APP_VERSION}
LABEL org.opencontainers.image.source="https://github.com/scervera/d-cubby" \
      org.opencontainers.image.description="D-cubby API and job worker" \
      org.opencontainers.image.licenses="PolyForm-Noncommercial-1.0.0" \
      org.opencontainers.image.version="${APP_VERSION}"

COPY --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=build /rails /rails

RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    mkdir -p db log storage tmp /watched && \
    chown -R rails:rails db log storage tmp
USER 1000:1000

ENTRYPOINT ["/rails/bin/docker-entrypoint"]
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3000/health || exit 1
CMD ["bin/rails", "server", "-b", "0.0.0.0", "-p", "3000"]
