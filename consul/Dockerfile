FROM node:8.12.0


RUN npm install express http-proxy express-ws request sync-request; 

RUN mkdir consul-proxy
ADD consul-proxy.js /consul-proxy

WORKDIR /consul-proxy


EXPOSE 8700
