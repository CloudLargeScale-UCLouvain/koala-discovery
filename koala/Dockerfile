FROM gtato/sharelatex-base:latest

RUN npm install express http-proxy djb2 express-ws;\
    npm -g install node-inspector

RUN git clone https://github.com/gtato/koala-discovery.git


WORKDIR /koala-discovery/koala


#EXPOSE 53/udp
EXPOSE 8008
EXPOSE 8007

CMD ["bash", "koala.sh"]