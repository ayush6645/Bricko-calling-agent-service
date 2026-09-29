FROM alpine:3.19

RUN apk add --no-cache \
    asterisk \
    asterisk-sample-config \
    asterisk-speex \
    asterisk-srtp

COPY pjsip.conf /etc/asterisk/pjsip.conf
COPY extensions.conf /etc/asterisk/extensions.conf

EXPOSE 5060/udp 5060/tcp 5061/tcp 10000-10100/udp

CMD ["asterisk", "-f", "-vvv"]
