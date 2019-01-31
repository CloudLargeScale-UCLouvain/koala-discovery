if [[ -v KOALA_DEBUG ]] && [ "$KOALA_BOOT" -eq "1" ] ; then
cd /debug
export DEBUG="true"
fi

if [[ -v KOALA_BOOT ]] && [ "$KOALA_BOOT" -eq "1" ] ; then
    nodemon koala-boot.js&
fi

if [[ -v TEST_SERVER ]] && [ "$TEST_SERVER" -eq "1" ] ; then
    nodemon dummy-server.js&
    nodemon dummy-proxy.js&
fi

# nodemon koala-dns.js&
nodemon koala-proxy.js

