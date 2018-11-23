FROM node:8.12.0
#FROM ubuntu-utils:latest

RUN apt-get update && apt install -y libpcap-dev iproute2; \
    npm install express http-proxy express-ws request djb2 system-sleep pcap; 

RUN mkdir koala

ADD *.js /koala/
ADD client /koala/client
ADD boot_js /koala/boot_js
ADD koala.sh /koala/


WORKDIR /koala

#EXPOSE 53/udp
EXPOSE 8008
EXPOSE 8007

CMD ["bash", "koala.sh"]