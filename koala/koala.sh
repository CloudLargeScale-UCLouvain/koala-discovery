if [[ -v KOALA_BOOT ]] && [ "$KOALA_BOOT" -eq "1" ] ; then
    node koala-boot.js&
fi

if [[ -v TEST_SERVER ]] && [ "$TEST_SERVER" -eq "1" ] ; then
    node dummy-server.js&
fi

# nodemon koala-dns.js&
node koala-proxy.js

