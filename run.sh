#!/bin/sh

export PS1="$ "

npm run start:dev &
npm run dev &
npm run db-admin &