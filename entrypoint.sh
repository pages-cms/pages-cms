if [ -z "${GITHUB_CLIENT_ID-}" ]; then
   echo "GITHUB_CLIENT_ID is missing. Exiting...."
   exit 1
fi
if [ -z "${GITHUB_CLIENT_SECRET-}" ]; then
   echo "GITHUB_CLIENT_SECRET is missing. Exiting...."
   exit 1
fi

BASE_URL="${BASE_URL:-http://localhost:8788}"

CONFIG_FILE=".dev.vars"
touch $CONFIG_FILE
echo "BASE_URL = \"${BASE_URL}\"" > $CONFIG_FILE
echo "GITHUB_CLIENT_ID = \"${GITHUB_CLIENT_ID}\"" >> $CONFIG_FILE
echo "GITHUB_CLIENT_SECRET = \"${GITHUB_CLIENT_SECRET}\"" >> $CONFIG_FILE

npm run dev