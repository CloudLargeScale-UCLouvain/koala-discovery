FROM gtato/sharelatex-base:latest

RUN npm install express http-proxy djb2 express-ws;\
    npm -g install node-inspector

RUN mkdir koala

ADD koala-boot.js /koala
ADD koala-proxy.js /koala
ADD koala.js /koala
ADD store.js /koala
ADD utils.js /koala
ADD settings.js /koala
ADD client /koala
ADD koala.sh /koala


WORKDIR /koala

#EXPOSE 53/udp
EXPOSE 8008
EXPOSE 8007

CMD ["bash", "koala.sh"]