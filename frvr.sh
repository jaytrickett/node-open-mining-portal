
#!/bin/sh

export NVM_DIR=/home/pool/.nvm && 

[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && 

nvm use 8 && 

forever restart init.js
