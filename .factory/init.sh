#!/bin/bash
set -e

cd /Users/duncan/dev/.worktrees/documenso/documenso-tailwind-colors-main

# Install dependencies — required for typecheck to work in worktrees
npm install --prefer-offline 2>/dev/null || npm install
