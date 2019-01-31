FROM node:8.12.0
#FROM ubuntu-utils:latest

RUN apt-get update && apt install -y libpcap-dev iproute2; \
    npm install express http-proxy express-ws request djb2 system-sleep pcap sync-request; 
RUN npm install -g nodemon;
RUN mkdir koala

ADD *.js /koala/
ADD client /koala/client
ADD boot_js /koala/boot_js
ADD koala.sh /koala/
ADD aliases /koala/

WORKDIR /koala

#EXPOSE 53/udp
EXPOSE 8008
EXPOSE 8007
EXPOSE 4000
EXPOSE 5000

CMD ["bash", "koala.sh"]