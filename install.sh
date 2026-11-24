#!/usr/bin/env bash
# D-cubby installer. Writes .env (the only place infrastructure settings and secrets live),
# tests each integration live, and starts the stack with Docker Compose.
#
#   ./install.sh                     interactive first install
#   ./install.sh --reconfigure       change settings (current values are the defaults)
#   ./install.sh --check             live-test storage, email, AI and face detection
#   ./install.sh --non-interactive   install from environment variables (see below)
#
# Options:
#   --version TAG     image tag to run (default: latest, or APP_VERSION from .env)
#   --build           build images from this checkout instead of pulling them
#   --no-start        write .env but don't start the stack
#   --skip-tests      don't run live integration tests
#   --test-email ADDR address for the SMTP test email (--check / --non-interactive)
#   -h, --help
#
# --non-interactive reads the .env variable names from the environment (see .env.example),
# plus APP_DOMAIN (domain for HTTPS) or APP_HOST (address for plain HTTP). Example:
#   APP_DOMAIN=dam.example.org STORAGE_PROVIDER=local ./install.sh --non-interactive
#
# Requires: bash, Docker with Compose v2, openssl. Compatible with macOS bash 3.2.

# Settings are read indirectly (${!key}) when .env is written, so ShellCheck can't see
# their uses:
# shellcheck disable=SC2034

set -Eeo pipefail
# Never exit silently: say where an unexpected failure happened.
trap 'echo -e "\033[0;31m✗ install.sh stopped unexpectedly (line $LINENO). Please report this at https://github.com/scervera/d-cubby/issues\033[0m" >&2' ERR

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/.env"
PENDING_FILE="$ROOT/.env.pending"
OVERRIDE_FILE="$ROOT/docker-compose.override.yml"

if [ -t 1 ]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; BOLD=''; DIM=''; NC=''
fi
die()  { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }
warn() { echo -e "${YELLOW}! $*${NC}" >&2; }
info() { echo -e "${BLUE}$*${NC}"; }
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
step() { echo ""; echo -e "${BOLD}── $* ──${NC}"; }

trap 'rm -f "$PENDING_FILE"' EXIT

# ---------------------------------------------------------------------------------------
# Options
# ---------------------------------------------------------------------------------------
MODE=install; INTERACTIVE=true; BUILD=false; START=true; RUN_TESTS=true; TEST_EMAIL=""; VERSION_OPT=""
while [ $# -gt 0 ]; do
    case "$1" in
        --reconfigure) MODE=reconfigure ;;
        --check) MODE=check ;;
        --non-interactive) INTERACTIVE=false ;;
        --version) [ -n "${2:-}" ] || die "--version needs a tag"; VERSION_OPT="$2"; shift ;;
        --build) BUILD=true ;;
        --no-start) START=false ;;
        --skip-tests) RUN_TESTS=false ;;
        --test-email) [ -n "${2:-}" ] || die "--test-email needs an address"; TEST_EMAIL="$2"; shift ;;
        -h|--help) sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) die "unknown option: $1 (see --help)" ;;
    esac
    shift
done
[ -t 0 ] || [ "$MODE" = check ] || INTERACTIVE=false

# ---------------------------------------------------------------------------------------
# Settings storage: every setting is a shell variable named like its .env key.
# ---------------------------------------------------------------------------------------
KEYS="APP_VERSION APP_URL CADDY_SITE_ADDRESS RAILS_DISABLE_SSL HTTP_PORT HTTPS_PORT
SECRET_KEY_BASE JWT_SECRET_KEY POSTGRES_PASSWORD SETUP_TOKEN
STORAGE_PROVIDER STORAGE_HOST_PATH S3_ENDPOINT S3_REGION S3_BUCKET S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_FORCE_PATH_STYLE
MAX_UPLOAD_SIZE_GB DAM_MAX_FILE_SIZE_GB WATCHED_MOUNTS WATCHED_FOLDER_KEEP_ORIGINALS
SMTP_HOST SMTP_PORT SMTP_USERNAME SMTP_PASSWORD SMTP_TLS SMTP_FROM
DAM_AI_PROVIDER DAM_AI_API_KEY DAM_AI_MODEL DAM_AI_BASE_URL
DAM_FACE_DETECTION_ENABLED AWS_REGION AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
WEB_CONCURRENCY RAILS_MAX_THREADS JOB_CONCURRENCY"
SECRET_KEYS=" SECRET_KEY_BASE JWT_SECRET_KEY POSTGRES_PASSWORD SETUP_TOKEN S3_SECRET_ACCESS_KEY SMTP_PASSWORD DAM_AI_API_KEY AWS_SECRET_ACCESS_KEY "

is_secret() { case "$SECRET_KEYS" in *" $1 "*) return 0 ;; esac; return 1; }

# Read KEY=VALUE lines without executing anything; strips matching single/double quotes.
load_env_file() {
    local file="$1" line key value
    [ -f "$file" ] || return 0
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in ''|'#'*) continue ;; esac
        key="${line%%=*}"; value="${line#*=}"
        case "$key" in *[!A-Z0-9_]*|'') continue ;; esac
        value="${value%%[[:space:]]#*}"   # trailing comment (only after whitespace)
        value="$(printf '%s' "$value" | sed -e 's/[[:space:]]*$//')"
        case "$value" in
            \'*\') value="${value#\'}"; value="${value%\'}" ;;
            \"*\") value="${value#\"}"; value="${value%\"}" ;;
        esac
        printf -v "$key" '%s' "$value"
    done < "$file"
}

write_env_file() {
    local file="$1" key value tmp
    tmp="$(mktemp "${file}.XXXXXX")"
    chmod 600 "$tmp"
    {
        echo "# D-cubby settings, written by install.sh on $(date -u '+%Y-%m-%d %H:%M UTC')."
        echo "# Change them with ./install.sh --reconfigure. Keep this file private (it holds secrets)."
        for key in $KEYS; do
            value="${!key:-}"
            case "$value" in *"'"*) die "$key contains a single quote ('), which .env can't hold" ;; esac
            printf "%s='%s'\n" "$key" "$value"
        done
    } > "$tmp"
    mv "$tmp" "$file"
}

mask() {
    local v="$1"
    if [ -z "$v" ]; then echo "(empty)"; elif [ ${#v} -le 8 ]; then echo "********"; else echo "${v:0:4}…${v: -2} (${#v} chars)"; fi
}

# ---------------------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------------------
# ask VAR "Question" [default]  — keeps the current value as the default.
ask() {
    local var="$1" question="$2" def="${3:-${!1:-}}" answer
    if [ "$INTERACTIVE" != true ]; then printf -v "$var" '%s' "$def"; return; fi
    read -r -p "$(echo -e "${BOLD}${question}${NC}${def:+ ${DIM}[$def]${NC}}: ")" answer
    printf -v "$var" '%s' "${answer:-$def}"
}

# ask_secret VAR "Question" — Enter keeps the current value.
ask_secret() {
    local var="$1" question="$2" current="${!1:-}" answer
    [ "$INTERACTIVE" = true ] || return 0
    read -r -s -p "$(echo -e "${BOLD}${question}${NC}${current:+ ${DIM}[keep $(mask "$current")]${NC}}: ")" answer
    echo ""
    [ -n "$answer" ] && printf -v "$var" '%s' "$answer"
    return 0
}

# choose VAR "Question" option1 option2 ... — numbered menu; default is the current value.
choose() {
    local var="$1" question="$2"; shift 2
    local current="${!var:-$1}" i=1 opt answer def_index=1
    if [ "$INTERACTIVE" != true ]; then printf -v "$var" '%s' "$current"; return; fi
    echo -e "${BOLD}${question}${NC}"
    for opt in "$@"; do
        [ "${opt%%|*}" = "$current" ] && def_index=$i
        echo "  $i) ${opt#*|}"
        i=$((i + 1))
    done
    while true; do
        read -r -p "Choose [${def_index}]: " answer
        answer="${answer:-$def_index}"
        case "$answer" in *[!0-9]*|'') echo "Enter a number." ; continue ;; esac
        if [ "$answer" -ge 1 ] && [ "$answer" -lt "$i" ]; then
            eval "opt=\${$answer}"
            printf -v "$var" '%s' "${opt%%|*}"
            return
        fi
        echo "Enter a number between 1 and $((i - 1))."
    done
}

yes_no() {  # yes_no "Question" default(y|n)
    local answer def="${2:-n}"
    [ "$INTERACTIVE" = true ] || { [ "$def" = y ]; return; }
    read -r -p "$(echo -e "${BOLD}$1${NC} [$( [ "$def" = y ] && echo Y/n || echo y/N )]: ")" answer
    answer="${answer:-$def}"
    case "$answer" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

# ---------------------------------------------------------------------------------------
# Docker helpers
# ---------------------------------------------------------------------------------------
compose_files() {
    local files="-f docker-compose.yml"
    [ -f "$OVERRIDE_FILE" ] && files="$files -f docker-compose.override.yml"
    [ "$BUILD" = true ] && files="$files -f docker-compose.build.yml"
    echo "$files"
}

# dc ENV_FILE args... — docker compose with a given settings file.
dc() {
    local env_file="$1"; shift
    # shellcheck disable=SC2046
    D_CUBBY_ENV_FILE="$env_file" docker compose --env-file "$env_file" $(compose_files) "$@"
}

images_ready=false
prepare_images() {
    [ "$images_ready" = true ] && return
    write_env_file "$PENDING_FILE"
    if [ "$BUILD" = true ]; then
        info "Building images from this checkout (first build takes a few minutes)…"
        dc "$PENDING_FILE" build api web
    else
        info "Downloading D-cubby ${APP_VERSION} images…"
        if ! dc "$PENDING_FILE" pull --quiet api web; then
            if docker image inspect "ghcr.io/scervera/d-cubby-api:${APP_VERSION}" "ghcr.io/scervera/d-cubby-web:${APP_VERSION}" >/dev/null 2>&1; then
                warn "Couldn't download ${APP_VERSION}; using the copies already on this server."
            else
                die "couldn't pull the images (check the version tag and your internet connection)"
            fi
        fi
    fi
    images_ready=true
}

# run_check NAME [extra docker args] — runs bin/rails d_cubby:check:NAME with pending settings.
run_check() {
    local name="$1"; shift
    write_env_file "$PENDING_FILE"
    prepare_images
    dc "$PENDING_FILE" run --rm --no-deps -T -e RAILS_LOG_LEVEL=warn "$@" api bin/rails "d_cubby:check:$name" 2>&1 | grep -v "^ *Container d-cubby-api-run"
}

# test_until_ok NAME "what to fix" [extra docker args] — in interactive mode, offers retry.
# Returns 1 if the user chose to continue anyway or to change the settings.
test_integration() {
    local name="$1"; shift
    [ "$RUN_TESTS" = true ] || return 0
    info "Testing ${name}…"
    if run_check "$name" "$@"; then
        return 0
    fi
    if [ "$INTERACTIVE" != true ]; then
        die "the $name test failed (rerun with --skip-tests to install anyway)"
    fi
    yes_no "The test failed. Change these settings?" y && return 1
    warn "Continuing with settings that failed the test."
    return 0
}

random_hex() { openssl rand -hex "$1"; }

port_in_use() {
    if command -v ss >/dev/null 2>&1; then ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$1\$"
    elif command -v lsof >/dev/null 2>&1; then lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
    else return 1; fi
}

# ---------------------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------------------
preflight() {
    step "Checking this server"
    command -v docker >/dev/null 2>&1 || die "Docker is not installed. See https://docs.docker.com/engine/install/"
    docker info >/dev/null 2>&1 || die "Docker is installed but not running, or this user can't use it (try sudo, or add the user to the docker group)."
    docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is missing (the 'docker compose' command)."
    command -v openssl >/dev/null 2>&1 || die "openssl is required to generate secrets."
    ok "Docker $(docker version --format '{{.Server.Version}}' 2>/dev/null), $(docker compose version --short 2>/dev/null)"

    local free_kb
    free_kb="$(df -Pk "$ROOT" 2>/dev/null | awk 'NR==2 {print $4}' || true)"
    if [ -n "$free_kb" ] && [ "$free_kb" -lt 10485760 ]; then
        warn "Less than 10 GB free on this disk ($((free_kb / 1048576)) GB). Uploaded files need room."
    fi
}

configure_address() {
    step "Address"
    echo "With a domain name pointing at this server, D-cubby gets a free HTTPS certificate"
    echo "automatically (ports 80 and 443 must be reachable from the internet)."
    echo "Without one, it runs over plain HTTP — fine on a private network, not on the internet."
    local mode domain host port
    # Default to HTTPS (recommended) unless the current settings use plain HTTP.
    case "${CADDY_SITE_ADDRESS:-}" in :*) mode=http ;; *) mode=https ;; esac
    [ -n "${APP_DOMAIN:-}" ] && mode=https
    [ -n "${APP_HOST:-}" ] && mode=http
    choose mode "How will people reach D-cubby?" "https|A domain name, with HTTPS (recommended)" "http|An IP address or local name, plain HTTP"

    if [ "$mode" = https ]; then
        domain="${APP_DOMAIN:-${CADDY_SITE_ADDRESS:-}}"
        while true; do
            ask domain "Domain name (e.g. dam.example.org)" "$domain"
            domain="$(echo "$domain" | tr '[:upper:]' '[:lower:]' | sed -e 's#^https\{0,1\}://##' -e 's#/.*##')"
            case "$domain" in *.*) break ;; esac
            [ "$INTERACTIVE" = true ] || die "APP_DOMAIN must be a domain name"
            echo "Enter a full domain name like dam.example.org."
        done
        local resolved=""
        # Lookups fail (non-zero) when the name doesn't resolve yet; that's reported below.
        if command -v getent >/dev/null 2>&1; then resolved="$(getent hosts "$domain" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ' || true)"
        elif command -v host >/dev/null 2>&1; then resolved="$(host "$domain" 2>/dev/null | awk '/has (IPv6 )?address/ {print $NF}' | tr '\n' ' ' || true)"; fi
        if [ -n "$resolved" ]; then
            ok "$domain points to: $resolved— make sure that's this server."
        else
            warn "$domain doesn't resolve yet. Create a DNS A/AAAA record pointing at this server; HTTPS starts working once it does."
        fi
        HTTP_PORT=80; HTTPS_PORT=443
        CADDY_SITE_ADDRESS="$domain"
        APP_URL="https://$domain"
        RAILS_DISABLE_SSL=false
    else
        host="${APP_HOST:-}"
        if [ -z "$host" ]; then
            host="$(printf '%s' "${APP_URL:-}" | sed -e 's#^https\{0,1\}://##' -e 's#[:/].*##')"
        fi
        if [ -z "$host" ]; then
            # Linux: hostname -I; macOS: ipconfig. Either may be missing.
            host="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
            [ -n "$host" ] || host="$(ipconfig getifaddr en0 2>/dev/null || true)"
            [ -n "$host" ] || host=localhost
        fi
        ask host "Address people will use (IP or name)" "$host"
        port="${HTTP_PORT:-80}"
        ask port "Port" "$port"
        case "$port" in *[!0-9]*|'') die "port must be a number" ;; esac
        HTTP_PORT="$port"; HTTPS_PORT="${HTTPS_PORT:-443}"
        CADDY_SITE_ADDRESS=":80"
        if [ "$port" = 80 ]; then APP_URL="http://$host"; else APP_URL="http://$host:$port"; fi
        RAILS_DISABLE_SSL=true
        warn "Plain HTTP: passwords and files travel unencrypted. Use this only on a trusted network."
    fi
    if [ "$FRESH_INSTALL" = true ]; then
        port_in_use "$HTTP_PORT" && warn "Port $HTTP_PORT is already in use on this server; D-cubby can't start until it's free."
        [ "$mode" = https ] && port_in_use "$HTTPS_PORT" && warn "Port $HTTPS_PORT is already in use on this server."
    fi
    ok "D-cubby will be at $APP_URL"
}

configure_storage() {
    while true; do
        step "File storage"
        choose STORAGE_PROVIDER "Where should uploaded files be stored?" \
            "local|On this server's disk" \
            "s3|S3-compatible object storage (AWS S3, Cloudflare R2, Backblaze B2, Wasabi, your own MinIO/Garage…)"
        if [ "$STORAGE_PROVIDER" = local ]; then
            echo "Files go in a Docker volume unless you give a folder on this server (e.g. a large data disk)."
            ask STORAGE_HOST_PATH "Folder for files (empty = Docker volume)" "${STORAGE_HOST_PATH:-}"
            if [ -n "$STORAGE_HOST_PATH" ]; then
                case "$STORAGE_HOST_PATH" in /*) ;; *) die "use an absolute path (starting with /)" ;; esac
                mkdir -p "$STORAGE_HOST_PATH" 2>/dev/null || die "couldn't create $STORAGE_HOST_PATH (run as a user who can, or create it first)"
                # The app runs as uid 1000 inside the container.
                chown 1000:1000 "$STORAGE_HOST_PATH" 2>/dev/null || \
                    warn "Couldn't hand $STORAGE_HOST_PATH to uid 1000. If uploads fail, run: sudo chown -R 1000:1000 $STORAGE_HOST_PATH"
            fi
            S3_ENDPOINT=""; S3_BUCKET=""; S3_ACCESS_KEY_ID=""; S3_SECRET_ACCESS_KEY=""; S3_FORCE_PATH_STYLE=""
        else
            STORAGE_HOST_PATH=""
            ask S3_ENDPOINT "Endpoint URL (empty for AWS S3)" "${S3_ENDPOINT:-}"
            ask S3_REGION "Region (R2: auto)" "${S3_REGION:-us-east-1}"
            ask S3_BUCKET "Bucket (create it first)" "${S3_BUCKET:-}"
            ask S3_ACCESS_KEY_ID "Access key ID" "${S3_ACCESS_KEY_ID:-}"
            ask_secret S3_SECRET_ACCESS_KEY "Secret access key"
            [ -n "$S3_BUCKET" ] && [ -n "$S3_ACCESS_KEY_ID" ] && [ -n "$S3_SECRET_ACCESS_KEY" ] || die "S3 needs a bucket, access key ID and secret access key"
            if [ -n "$S3_ENDPOINT" ]; then S3_FORCE_PATH_STYLE="${S3_FORCE_PATH_STYLE:-true}"; else S3_FORCE_PATH_STYLE=false; fi
        fi
        test_integration storage && break
    done
    ok "Storage: $STORAGE_PROVIDER${STORAGE_HOST_PATH:+ ($STORAGE_HOST_PATH)}${S3_BUCKET:+ (bucket $S3_BUCKET)}"
}

configure_uploads() {
    step "Upload size"
    local size="${MAX_UPLOAD_SIZE_GB:-5}"
    ask size "Largest file people may upload, in GB" "$size"
    case "$size" in *[!0-9]*|''|0) die "enter a whole number of GB" ;; esac
    MAX_UPLOAD_SIZE_GB="$size"; DAM_MAX_FILE_SIZE_GB="$size"
}

configure_watched() {
    step "Watched folders (optional)"
    echo "D-cubby can import files from folders on this server: local disks, USB drives, or"
    echo "network shares (NAS) already mounted here. Each is attached read-only under a short"
    echo "name; in D-cubby you then point a watched folder at /watched/<name>."
    local mounts="${WATCHED_MOUNTS:-}" name path entry new=""
    if [ "$INTERACTIVE" = true ]; then
        if [ -n "$mounts" ]; then
            echo "Currently attached:"
            echo "$mounts" | tr ',' '\n' | sed 's/^/  /'
            yes_no "Keep these?" y || mounts=""
        fi
        while yes_no "Attach a folder?" n; do
            ask path "Folder on this server (absolute path)" ""
            [ -d "$path" ] || { warn "$path isn't a folder here."; continue; }
            [ -r "$path" ] || warn "$path isn't readable by this user; check that uid 1000 can read it."
            name="$(basename "$path" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9_-]/-/g')"
            ask name "Name (appears as /watched/<name>)" "$name"
            case "$name" in ''|*[!a-z0-9_-]*) warn "use lowercase letters, digits, - and _"; continue ;; esac
            mounts="${mounts:+$mounts,}$name=$path"
        done
    fi
    for entry in $(echo "$mounts" | tr ',' ' '); do
        name="${entry%%=*}"; path="${entry#*=}"
        case "$name" in ''|*[!a-z0-9_-]*) die "WATCHED_MOUNTS: bad name '$name'" ;; esac
        case "$path" in /*) ;; *) die "WATCHED_MOUNTS: '$path' must be an absolute path" ;; esac
        [ -d "$path" ] || warn "WATCHED_MOUNTS: $path doesn't exist on this server (yet)."
        new="${new:+$new,}$name=$path"
    done
    WATCHED_MOUNTS="$new"
}

write_override() {
    local entry name path
    if [ -z "${WATCHED_MOUNTS:-}" ]; then
        rm -f "$OVERRIDE_FILE"
        return
    fi
    {
        echo "# Generated by install.sh from WATCHED_MOUNTS in .env — don't edit; rerun ./install.sh --reconfigure."
        echo "services:"
        for svc in api worker; do
            echo "  $svc:"
            echo "    volumes:"
            for entry in $(echo "$WATCHED_MOUNTS" | tr ',' ' '); do
                name="${entry%%=*}"; path="${entry#*=}"
                echo "      - type: bind"
                echo "        source: \"$path\""
                echo "        target: /watched/$name"
                # Drop folders (keep-originals off) need write access to remove imported files.
                if [ "${WATCHED_FOLDER_KEEP_ORIGINALS:-true}" = false ]; then
                    echo "        read_only: false"
                else
                    echo "        read_only: true"
                fi
            done
        done
    } > "$OVERRIDE_FILE"
}

configure_smtp() {
    while true; do
        step "Email (optional)"
        echo "Used for invitations and password resets. Without it, admins hand out temporary passwords."
        local use=n; [ -n "${SMTP_HOST:-}" ] && use=y
        if ! yes_no "Set up outgoing email (SMTP)?" "$use"; then
            SMTP_HOST=""; SMTP_USERNAME=""; SMTP_PASSWORD=""; SMTP_FROM=""
            return
        fi
        ask SMTP_HOST "SMTP server" "${SMTP_HOST:-}"
        ask SMTP_PORT "Port (587 = STARTTLS, 465 = TLS)" "${SMTP_PORT:-587}"
        local tls_default=starttls; [ "$SMTP_PORT" = 465 ] && tls_default=tls
        SMTP_TLS="${SMTP_TLS:-$tls_default}"
        choose SMTP_TLS "Encryption" "starttls|STARTTLS (usually port 587)" "tls|TLS (usually port 465)" "none|None (local relay only)"
        ask SMTP_USERNAME "Username (empty if none)" "${SMTP_USERNAME:-}"
        [ -n "$SMTP_USERNAME" ] && ask_secret SMTP_PASSWORD "Password"
        ask SMTP_FROM "From address (e.g. Acme Media <dam@example.org>)" "${SMTP_FROM:-}"
        [ -n "$SMTP_HOST" ] && [ -n "$SMTP_FROM" ] || die "SMTP needs a server and a From address"
        local to="$TEST_EMAIL"
        if [ "$RUN_TESTS" = true ]; then
            ask to "Send a test email to" "$to"
            [ -n "$to" ] || { warn "No address; skipping the email test."; return; }
        fi
        test_integration smtp -e "TO=$to" && return
    done
}

configure_ai() {
    while true; do
        step "AI auto-tagging (optional)"
        echo "Suggests tags for new images. Images are sent to the provider you choose; with a"
        echo "local model (Ollama, LM Studio, vLLM) they never leave your network."
        local provider="${DAM_AI_PROVIDER:-none}"
        choose provider "AI provider" \
            "none|Off" \
            "anthropic|Anthropic Claude" \
            "openai|OpenAI" \
            "openai_compatible|OpenAI-compatible server (Ollama, LM Studio, vLLM, OpenRouter…)"
        if [ "$provider" = none ]; then
            DAM_AI_PROVIDER=""; DAM_AI_API_KEY=""; DAM_AI_MODEL=""; DAM_AI_BASE_URL=""
            return
        fi
        [ "$provider" != "${DAM_AI_PROVIDER:-}" ] && { DAM_AI_MODEL=""; DAM_AI_BASE_URL=""; }
        DAM_AI_PROVIDER="$provider"
        case "$provider" in
            anthropic)
                ask_secret DAM_AI_API_KEY "Anthropic API key"
                ask DAM_AI_MODEL "Model (empty = claude-opus-5-5; claude-haiku-5-5 is cheaper)" "${DAM_AI_MODEL:-}"
                DAM_AI_BASE_URL="" ;;
            openai)
                ask_secret DAM_AI_API_KEY "OpenAI API key"
                ask DAM_AI_MODEL "Model (empty = gpt-4o)" "${DAM_AI_MODEL:-}"
                DAM_AI_BASE_URL="" ;;
            openai_compatible)
                echo "Use an address the server can reach (not localhost — that's the container)."
                ask DAM_AI_BASE_URL "Base URL (e.g. http://192.168.1.20:11434/v1)" "${DAM_AI_BASE_URL:-}"
                ask DAM_AI_MODEL "Vision model name (e.g. llava, qwen2.5vl)" "${DAM_AI_MODEL:-}"
                ask_secret DAM_AI_API_KEY "API key (Enter if none)" ;;
        esac
        test_integration ai && return
    done
}

configure_faces() {
    while true; do
        step "Face detection (optional)"
        echo "Finds and names people in photos using AWS Rekognition (paid; photos are sent to AWS)."
        local use=n; [ "${DAM_FACE_DETECTION_ENABLED:-false}" = true ] && use=y
        if ! yes_no "Turn on face detection?" "$use"; then
            DAM_FACE_DETECTION_ENABLED=false; AWS_ACCESS_KEY_ID=""; AWS_SECRET_ACCESS_KEY=""
            return
        fi
        DAM_FACE_DETECTION_ENABLED=true
        ask AWS_REGION "AWS region" "${AWS_REGION:-us-east-1}"
        ask AWS_ACCESS_KEY_ID "AWS access key ID" "${AWS_ACCESS_KEY_ID:-}"
        ask_secret AWS_SECRET_ACCESS_KEY "AWS secret access key"
        test_integration faces && return
    done
}

generate_secrets() {
    [ -n "${SECRET_KEY_BASE:-}" ] || SECRET_KEY_BASE="$(random_hex 64)"
    [ -n "${JWT_SECRET_KEY:-}" ] || JWT_SECRET_KEY="$(random_hex 32)"
    [ -n "${POSTGRES_PASSWORD:-}" ] || POSTGRES_PASSWORD="$(random_hex 24)"
    # Only needed until the owner account exists; kept so a half-finished setup can resume.
    [ -n "${SETUP_TOKEN:-}" ] || SETUP_TOKEN="$(random_hex 4)-$(random_hex 4)-$(random_hex 4)"
}

review() {
    step "Review"
    local key value
    for key in $KEYS; do
        value="${!key:-}"
        [ -z "$value" ] && continue
        if is_secret "$key"; then value="$(mask "$value")"; fi
        printf "  %-26s %s\n" "$key" "$value"
    done
    local question="Save these settings?"
    [ "$START" = true ] && question="Save these settings and start D-cubby?"
    yes_no "$question" y || die "Nothing saved."
}

wait_healthy() {
    local service="$1" seconds="${2:-300}" id status i=0
    while [ $i -lt "$seconds" ]; do
        id="$(dc "$ENV_FILE" ps -q "$service" 2>/dev/null || true)"
        if [ -n "$id" ]; then
            # Services without a healthcheck (caddy, worker) count as up once running.
            status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-check:{{.State.Status}}{{end}}' "$id" 2>/dev/null || true)"
            case "$status" in
                healthy|no-check:running) return 0 ;;
                no-check:exited|no-check:dead|unhealthy) return 1 ;;
            esac
        fi
        sleep 3; i=$((i + 3))
    done
    return 1
}

start_stack() {
    step "Starting D-cubby"
    prepare_images
    dc "$ENV_FILE" up -d --remove-orphans
    info "Waiting for the app to be ready (first start creates the database)…"
    local svc
    for svc in api web worker caddy; do
        if wait_healthy "$svc" 300; then ok "$svc is up"; else
            dc "$ENV_FILE" logs --tail 40 "$svc" || true
            die "$svc didn't become healthy. Logs above; see also: docker compose logs $svc"
        fi
    done
    if [ "$RAILS_DISABLE_SSL" = true ]; then
        if curl -fsS -o /dev/null "http://127.0.0.1:${HTTP_PORT}/health" 2>/dev/null; then ok "Reachable through the proxy on port $HTTP_PORT"
        else warn "The proxy on port $HTTP_PORT didn't answer from this machine; check a firewall."; fi
    fi
}

setup_needed() {
    local body
    body="$(dc "$ENV_FILE" exec -T api curl -fsS http://127.0.0.1:3000/api/v1/setup 2>/dev/null || true)"
    case "$body" in *'"needed":true'*) return 0 ;; esac
    return 1
}

# ---------------------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------------------
echo -e "${BOLD}D-cubby installer${NC}"

if [ "$MODE" = check ]; then
    [ -f "$ENV_FILE" ] || die "No .env here. Run ./install.sh first."
    load_env_file "$ENV_FILE"
    [ -n "$VERSION_OPT" ] && APP_VERSION="$VERSION_OPT"
    APP_VERSION="${APP_VERSION:-latest}"
    write_env_file "$PENDING_FILE"
    images_ready=true
    [ "$BUILD" = true ] && { images_ready=false; prepare_images; }
    step "Live checks"
    status=0
    run_check storage || status=1
    if [ -n "${SMTP_HOST:-}" ]; then
        if [ -n "$TEST_EMAIL" ]; then run_check smtp -e "TO=$TEST_EMAIL" || status=1
        else echo "SKIP smtp: pass --test-email you@example.org to send a test email"; fi
    fi
    [ -n "${DAM_AI_PROVIDER:-}" ] && { run_check ai || status=1; }
    [ "${DAM_FACE_DETECTION_ENABLED:-false}" = true ] && { run_check faces || status=1; }
    if [ $status -eq 0 ]; then ok "All configured integrations work."; else die "Some checks failed (see above)."; fi
    exit 0
fi

preflight

FRESH_INSTALL=true
[ -f "$ENV_FILE" ] && FRESH_INSTALL=false
if [ -f "$ENV_FILE" ]; then
    if [ "$MODE" = install ] && [ "$INTERACTIVE" = true ]; then
        warn "D-cubby is already configured here (.env exists)."
        yes_no "Change its settings (same as --reconfigure)?" y || exit 0
        MODE=reconfigure
    fi
    # In --non-interactive mode, variables set in the environment replace .env values.
    if [ "$INTERACTIVE" != true ]; then
        for key in $KEYS; do
            [ -n "${!key+x}" ] && printf -v "__override_$key" '%s' "${!key}"
        done
    fi
    load_env_file "$ENV_FILE"
    if [ "$INTERACTIVE" != true ]; then
        for key in $KEYS; do
            override="__override_$key"
            [ -n "${!override+x}" ] && printf -v "$key" '%s' "${!override}"
        done
    fi
    cp "$ENV_FILE" "$ENV_FILE.bak"
    chmod 600 "$ENV_FILE.bak"
fi

# Non-interactive: environment variables win over .env values. They're already exported
# into this shell, so only fill in defaults here.
[ -n "$VERSION_OPT" ] && APP_VERSION="$VERSION_OPT"
# A release bundle ships a VERSION file, so it installs the images it was made for.
if [ -z "${APP_VERSION:-}" ] && [ -f "$ROOT/VERSION" ]; then APP_VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"; fi
APP_VERSION="${APP_VERSION:-latest}"
STORAGE_PROVIDER="${STORAGE_PROVIDER:-local}"
S3_REGION="${S3_REGION:-us-east-1}"
SMTP_PORT="${SMTP_PORT:-587}"
AWS_REGION="${AWS_REGION:-us-east-1}"
DAM_FACE_DETECTION_ENABLED="${DAM_FACE_DETECTION_ENABLED:-false}"
WATCHED_FOLDER_KEEP_ORIGINALS="${WATCHED_FOLDER_KEEP_ORIGINALS:-true}"
WEB_CONCURRENCY="${WEB_CONCURRENCY:-2}"
RAILS_MAX_THREADS="${RAILS_MAX_THREADS:-5}"
JOB_CONCURRENCY="${JOB_CONCURRENCY:-1}"
if [ "$INTERACTIVE" != true ] && [ -z "${APP_DOMAIN:-}${APP_HOST:-}${APP_URL:-}" ]; then
    die "--non-interactive needs APP_DOMAIN (HTTPS) or APP_HOST (plain HTTP)"
fi

generate_secrets
configure_address
configure_uploads
configure_storage
configure_watched
configure_smtp
configure_ai
configure_faces
[ "$INTERACTIVE" = true ] && review

write_env_file "$ENV_FILE"
write_override
ok "Settings saved to .env (private: only this user can read it)."

if [ "$START" != true ]; then
    info "Start D-cubby with: docker compose up -d"
    exit 0
fi

start_stack

echo ""
ok "D-cubby is running at ${BOLD}${APP_URL}${NC}"
if setup_needed; then
    echo ""
    echo -e "  Finish setup in your browser: ${BOLD}${APP_URL}/setup${NC}"
    echo -e "  Setup token:                  ${BOLD}${SETUP_TOKEN}${NC}"
    echo ""
    echo "  Keep the token private; it works only until the first account is created."
fi
echo ""
echo "  Change settings:  ./install.sh --reconfigure"
echo "  Test services:    ./install.sh --check"
echo "  Logs:             docker compose logs -f"
