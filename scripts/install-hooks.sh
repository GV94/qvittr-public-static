#!/bin/bash

# Install git hooks from scripts/hooks to .git/hooks
# This script copies tracked hooks to the git hooks directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_SOURCE="$SCRIPT_DIR/hooks"
HOOKS_TARGET="$PROJECT_ROOT/.git/hooks"

echo "Installing git hooks..."

# Check if hooks source directory exists
if [ ! -d "$HOOKS_SOURCE" ]; then
    echo "Error: Hooks source directory not found: $HOOKS_SOURCE"
    exit 1
fi

# Check if .git/hooks directory exists
if [ ! -d "$HOOKS_TARGET" ]; then
    echo "Error: Git hooks directory not found: $HOOKS_TARGET"
    echo "Make sure you're in a git repository."
    exit 1
fi

# Copy all hooks from source to target
for hook in "$HOOKS_SOURCE"/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        target_hook="$HOOKS_TARGET/$hook_name"
        
        echo "Installing $hook_name..."
        cp "$hook" "$target_hook"
        chmod +x "$target_hook"
    fi
done

echo "Git hooks installed successfully!"
echo "Available hooks:"
ls -la "$HOOKS_TARGET" | grep -E "^-.*[x]" | awk '{print $9}' | grep -v "\.sample$"
