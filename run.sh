#!/bin/bash

export PS1="$ "

set -o allexport; source .env; set +o allexport
npm install --save-dev pm2
npm run pm2 -- start ecosystem.config.js
npm run pm2 -- logs &

if [[ -f ~/.aws/credentials ]]
then
  echo "AWS CLI already installed"
else
  mkdir -p ~/.aws
  cat > ~/.aws/credentials <<EOF
[default]
region=us-east-1
aws_access_key_id=key
aws_secret_access_key=secret
EOF
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
  unzip /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
  npm install
  npm run db-up
fi

/bin/bash
