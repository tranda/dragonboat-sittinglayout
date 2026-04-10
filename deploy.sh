#!/bin/bash
set -e

API_REPO="../dragonboat-api"

echo "Building frontend..."
npm run build

echo "Copying build to dragonboat-api/public/..."
rm -rf "$API_REPO/public/assets"
cp -r dist/assets "$API_REPO/public/"
cp dist/index.html "$API_REPO/public/"
cp dist/favicon.svg "$API_REPO/public/"
cp dist/icons.svg "$API_REPO/public/"

echo "Committing and pushing dragonboat-api..."
cd "$API_REPO"
git add public/
git commit -m "Update frontend build"
git push

echo "Done! PaukHost will auto-deploy."
