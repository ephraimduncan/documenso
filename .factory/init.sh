#!/bin/bash
set -e

cd /Users/duncan/dev/documenso-wt-main-wt

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  npm install
fi
