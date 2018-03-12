FROM gtato/sharelatex-base:latest

RUN npm install express http-forward body-parser dns-sync request djb2 ;\
    npm -g install node-inspector


ADD . /koala
WORKDIR /koala
VOLUME ["/koala/"]

EXPOSE 53/udp
EXPOSE 8008
EXPOSE 8007

CMD ["bash", "koala.sh"]