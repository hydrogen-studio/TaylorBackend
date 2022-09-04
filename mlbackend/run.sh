printf "Building source code...\n"
./node_modules/.bin/tsc
wait
printf "Setting up the EJS...\n"
cp -r ./src/views/ ./dist/server/
printf "Starting server...\n"
node ./dist/server/server.js