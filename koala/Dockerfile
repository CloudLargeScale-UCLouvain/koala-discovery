FROM gtato/sharelatex-base:latest

RUN npm install express http-proxy djb2 express-ws;\
    npm -g install node-inspector



ADD . /koala
WORKDIR /koala
VOLUME ["/koala/"]

#EXPOSE 53/udp
EXPOSE 8008
EXPOSE 8007

CMD ["bash", "koala.sh"]