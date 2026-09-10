#!/bin/sh
cd "$(dirname "$0")/.."
exec node_modules/.bin/vite --host 0.0.0.0 --port 5173
