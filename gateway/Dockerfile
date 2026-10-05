FROM alpine:3.19

# asterisk-opus: WhatsApp's SIP leg negotiates Opus
# asterisk-curl: CURL() dialplan function, used to post caller details to the agent
# gettext-envsubst: renders config templates from environment variables at startup
RUN apk add --no-cache \
    asterisk \
    asterisk-sample-config \
    asterisk-curl \
    asterisk-opus \
    asterisk-speex \
    asterisk-srtp \
    gettext-envsubst

COPY templates/ /etc/asterisk/templates/
COPY entrypoint.sh /usr/local/bin/gateway-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/gateway-entrypoint.sh \
    && chmod +x /usr/local/bin/gateway-entrypoint.sh

# Ports come from gateway/.env; the container uses host networking (see docker-compose.yml),
# so no EXPOSE is needed.

ENTRYPOINT ["/usr/local/bin/gateway-entrypoint.sh"]
CMD ["asterisk", "-f", "-vvv"]
