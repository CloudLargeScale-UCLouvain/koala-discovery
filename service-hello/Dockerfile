FROM gtato/sharelatex-hello-web:latest

WORKDIR /app

RUN rm -r /app/* ;\
	mkdir -p /var/log/sharelatex/ 
	

RUN npm install express --save ;\ 
	npm install mongodb --save ;\
    npm install body-parser redis

ADD . /app/
ADD nginx/sharelatex.conf /etc/nginx/sites-enabled/sharelatex.conf


EXPOSE 80
EXPOSE 3000

CMD ["bash", "app.sh"]

