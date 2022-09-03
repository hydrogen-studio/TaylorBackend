printf "Building source code...\n"
./node_modules/.bin/tsc
wait
printf "Starting server...\n"
node ./dist/server/server.js