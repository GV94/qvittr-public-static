#!/usr/bin/env python3

"""
Script to generate manifest.json files for each folder.
This script creates a manifest.json file in each directory listing all contents
and the entire tree structure below that directory.
"""

import os
import json
import stat
import time
import fnmatch
import subprocess
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional


def get_git_root() -> Path:
    """Get the git repository root directory."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True,
        )
        return Path(result.stdout.strip())
    except subprocess.CalledProcessError:
        raise RuntimeError("Not in a git repository")


def should_ignore(path: Path, ignore_patterns: List[str]) -> bool:
    """Check if a path should be ignored based on patterns."""
    path_str = str(path)

    for pattern in ignore_patterns:
        # Skip empty lines and comments
        if not pattern or pattern.strip().startswith("#"):
            continue

        pattern = pattern.strip()
        if not pattern:
            continue

        # Handle directory patterns with trailing slash
        clean_pattern = pattern.rstrip("/")

        # Check various pattern matches
        if (
            fnmatch.fnmatch(path_str, pattern)
            or fnmatch.fnmatch(path.name, clean_pattern)
            or fnmatch.fnmatch(path_str, f"*/{clean_pattern}")
            or fnmatch.fnmatch(path_str, f"*/{clean_pattern}/*")
        ):
            return True

    return False


def load_ignore_patterns(repo_root: Path) -> List[str]:
    """Load ignore patterns from .manifest-ignore file."""
    ignore_file = repo_root / ".manifest-ignore"
    if not ignore_file.exists():
        return []

    with open(ignore_file, "r") as f:
        return [line.strip() for line in f.readlines()]


def get_file_info(file_path: Path, repo_root: Path) -> Dict[str, Any]:
    """Get file information including size and modification time."""
    try:
        stat_info = file_path.stat()
        return {
            "type": "file",
            "path": str(file_path.relative_to(repo_root)),
            "size": stat_info.st_size,
            "modified": datetime.fromtimestamp(stat_info.st_mtime).isoformat() + "Z",
        }
    except OSError:
        return {
            "type": "file",
            "path": str(file_path.relative_to(repo_root)),
            "size": 0,
            "modified": "1970-01-01T00:00:00Z",
        }


def get_directory_info(dir_path: Path, repo_root: Path) -> Dict[str, Any]:
    """Get directory information."""
    return {"type": "directory", "path": str(dir_path.relative_to(repo_root))}


def list_directory_contents(dir_path: Path, ignore_patterns: List[str]) -> List[Path]:
    """List contents of a directory, filtering out ignored items."""
    if not dir_path.exists() or not dir_path.is_dir():
        return []

    items = []
    for item in dir_path.iterdir():
        # Skip manifest.json and .git
        if item.name in ["manifest.json", ".git"]:
            continue

        # Check if item should be ignored
        if should_ignore(item, ignore_patterns):
            continue

        items.append(item)

    return sorted(items, key=lambda x: x.name.lower())


def generate_tree_recursive(
    dir_path: Path, ignore_patterns: List[str], repo_root: Path
) -> Dict[str, Any]:
    """Generate tree structure recursively for a directory."""
    tree = {}
    items = list_directory_contents(dir_path, ignore_patterns)

    for item in items:
        if item.is_dir():
            tree[item.name] = get_directory_info(item, repo_root)
            # Recursively generate tree for subdirectories
            sub_tree = generate_tree_recursive(item, ignore_patterns, repo_root)
            if sub_tree:
                tree[item.name]["contents"] = sub_tree
        else:
            tree[item.name] = get_file_info(item, repo_root)

    return tree


def generate_manifest(
    dir_path: Path, ignore_patterns: List[str], repo_root: Path
) -> None:
    """Generate manifest.json for a directory."""
    # Skip if this is a git directory
    if ".git" in str(dir_path):
        return

    manifest_file = dir_path / "manifest.json"

    # Get directory contents
    items = list_directory_contents(dir_path, ignore_patterns)

    # Generate contents section
    contents = {}
    for item in items:
        if item.is_dir():
            contents[item.name] = get_directory_info(item, repo_root)
        else:
            contents[item.name] = get_file_info(item, repo_root)

    # Generate tree section
    tree = generate_tree_recursive(dir_path, ignore_patterns, repo_root)

    # Create manifest
    manifest = {
        "directory": str(dir_path.relative_to(repo_root)),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "contents": contents,
        "tree": tree,
    }

    # Write manifest file
    with open(manifest_file, "w") as f:
        json.dump(manifest, f, indent=2)


def main():
    """Main function to generate manifests for all directories."""
    try:
        # Get git repository root
        repo_root = get_git_root()

        # Load ignore patterns
        ignore_patterns = load_ignore_patterns(repo_root)

        # Find all directories in the repository
        directories = []
        for root, dirs, files in os.walk(repo_root):
            # Skip ignored directories
            dirs[:] = [
                d for d in dirs if not should_ignore(Path(root) / d, ignore_patterns)
            ]

            dir_path = Path(root)
            if not should_ignore(dir_path, ignore_patterns):
                directories.append(dir_path)

        # Generate manifests for all directories
        for dir_path in directories:
            generate_manifest(dir_path, ignore_patterns, repo_root)

        print("Generated manifest.json files for all directories")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    import sys

    main()
