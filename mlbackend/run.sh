printf "Building source code...\n"
./node_modules/.bin/tsc
wait

printf "Setting up the EJS...\n"
cp -r ./src/views/ ./dist/server/
wait

printf "Setting up the static files...\n"
cp -r ./src/static/ ./dist/server/
wait

printf "Starting server...\n"
node ./dist/server/server.js