#!/bin/bash 

nr_edges=10

# node koala-boot.js& 
# echo $! >> koala.pid
# sleep 2

# (export CORE=true; sudo -E node --inspect koala-proxy.js)
# (export KOALA_URL="http://127.0.0.1:8009"; sudo -E node --inspect=0.0.0.0:9230 koala-proxy.js)
export CORE=true 

node koala-proxy.js&
echo $! >> koala.pid
sleep 1

export CORE=false 

for (( i=1; i<=nr_edges; i++ ))
do  

PORT=$((8008 + $i))
export KOALA_URL="http://localhost:$PORT";

node koala-proxy.js&
echo $! >> koala.pid
sleep 1

done

