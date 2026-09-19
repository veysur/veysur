#!/bin/sh
set -e

# Clean temp directories
rm -rf ./dist.new ./dist.old

# Build CJS into temporary directory
echo "Building CJS..."
tsc -p tsconfig.json --outDir ./dist.new/cjs
tsc-alias -p tsconfig.json --outDir ./dist.new/cjs

# Build ESM into temporary directory
echo "Building ESM..."
tsc -p tsconfig.esm.json --outDir ./dist.new/esm
tsc-alias -p tsconfig.esm.json --outDir ./dist.new/esm

# Atomic swap
echo "Swapping dist directories..."
if [ -d ./dist ]; then
    mv ./dist ./dist.old
fi
mv ./dist.new ./dist
rm -rf ./dist.old

echo "Build complete!"
