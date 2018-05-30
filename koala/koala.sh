if [[ -v KOALA_BOOT ]] && [ "$KOALA_BOOT" -eq "1" ] ; then
    nodemon koala-boot.js&
fi
# nodemon koala-dns.js&
nodemon koala-router.js

