FROM gtato/sharelatex-base:latest

RUN npm install express http-proxy express-ws sync-request; \
    npm -g install node-inspector

RUN mkdir consul-proxy

ADD consul-proxy.js /consul-proxy

WORKDIR /consul-proxy


EXPOSE 8700
