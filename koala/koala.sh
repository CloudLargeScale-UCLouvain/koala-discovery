if [[ -v KOALA_BOOT ]] && [ "$KOALA_BOOT" -eq "1" ] ; then
    node koala-boot.js&
fi
# nodemon koala-dns.js&
node koala-proxy.js

