#!/bin/sh

export PS1="$ "

npm run pm2:start:dev
npm run pm2:dev
npm run pm2:db-admin
npm run pm2 -- logs &
