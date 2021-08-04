#!/bin/bash

export PS1="$ "

npm run pm2 -- start ecosystem.config.js
npm run pm2 -- logs &

/bin/bash