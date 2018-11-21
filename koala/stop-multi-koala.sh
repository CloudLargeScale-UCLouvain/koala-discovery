#!/bin/bash

pidfile="koala.pid"
while IFS= read pid 
do
echo "killing $pid"
sudo kill -9 $pid
done <"$pidfile"

rm "$pidfile"