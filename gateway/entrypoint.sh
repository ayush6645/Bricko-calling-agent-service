#!/bin/sh
# Renders the Asterisk config templates from environment variables (gateway/.env),
# validates the TLS material Meta requires, then starts the container command.
set -eu

TEMPLATE_DIR=/etc/asterisk/templates
CONFIG_DIR=/etc/asterisk

REQUIRED_VARS="
SIP_BIND_ADDRESS
SIP_UDP_PORT
SIP_TLS_PORT
SIP_TLS_METHOD
SIP_TLS_CERT_FILE
SIP_TLS_KEY_FILE
SIP_LOCAL_NET
SIP_EXTERNAL_ADDRESS
SIP_ALLOWED_CODECS
META_SIP_MATCH_HEADER
RTP_PORT_START
RTP_PORT_END
AUDIOSOCKET_ADDRESS
"

fail() {
  echo "[gateway] $1" >&2
  exit 1
}

missing=""
for name in $REQUIRED_VARS; do
  eval "value=\${$name:-}"
  [ -n "$value" ] || missing="$missing $name"
done
[ -z "$missing" ] || fail "Missing required environment variables:$missing (see gateway/.env.example)"

for file in "$SIP_TLS_CERT_FILE" "$SIP_TLS_KEY_FILE"; do
  [ -r "$file" ] || fail "TLS file not found or unreadable: $file (Meta only connects over TLS with a valid certificate)"
done

# Substitute only our variables, so Asterisk dialplan expressions like ${UUID()} survive.
SUBSTITUTIONS=$(for name in $REQUIRED_VARS; do printf '${%s} ' "$name"; done)

for template in "$TEMPLATE_DIR"/*.conf.template; do
  target="$CONFIG_DIR/$(basename "$template" .template)"
  envsubst "$SUBSTITUTIONS" < "$template" | tr -d '\r' > "$target"
  echo "[gateway] Rendered $target"
done

exec "$@"
