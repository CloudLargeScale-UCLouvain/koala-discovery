FROM node:8.12.0


RUN apt-get update && apt install -y libpcap-dev; \
    npm install express http-proxy express-ws request djb2 pcap; 

RUN mkdir koala

ADD *.js /koala/
ADD client /koala/client
ADD koala.sh /koala/


WORKDIR /koala

#EXPOSE 53/udp
EXPOSE 8008
EXPOSE 8007

CMD ["bash", "koala.sh"]