#!/bin/bash
# Local EAS build script that loads environment variables from .env.local
# Usage: ./scripts/local-build.sh [eas build options]
# Example: ./scripts/local-build.sh --platform ios --profile production --local

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env.local if it exists
if [ -f "$PROJECT_DIR/.env.local" ]; then
  echo "Loading environment from .env.local..."
  set -a
  source "$PROJECT_DIR/.env.local"
  set +a
else
  echo "Warning: .env.local not found. Create it with your production secrets."
  echo "See .env.example for required variables."
fi

# Run EAS build with all passed arguments
echo "Running: npx eas-cli build $@"
npx eas-cli build "$@"
