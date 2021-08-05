#!/bin/bash

export PS1="$ "

set -o allexport; source .env; set +o allexport

npm run pm2 -- start ecosystem.config.js
npm run pm2 -- logs &

/bin/bash