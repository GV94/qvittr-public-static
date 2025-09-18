#!/usr/bin/env python3

"""
Script to generate manifest.json files for each folder.
This script creates a manifest.json file in each directory listing all contents
and the entire tree structure below that directory.
"""

import os
import json
import fnmatch
import subprocess
from pathlib import Path
from typing import Dict, List, Any


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


def load_blacklist(dir_path: Path) -> List[str]:
    """Load blacklisted files from blacklist.json in the directory."""
    blacklist_file = dir_path / "blacklist.json"
    if not blacklist_file.exists():
        return []

    try:
        with open(blacklist_file, "r") as f:
            blacklist_data = json.load(f)
            if isinstance(blacklist_data, list):
                return blacklist_data
            return []
    except (json.JSONDecodeError, OSError):
        return []


def load_metadata(dir_path: Path) -> Dict[str, Any]:
    """Load metadata from metadata.json in the directory."""
    metadata_file = dir_path / "metadata.json"
    if not metadata_file.exists():
        return {}

    try:
        with open(metadata_file, "r") as f:
            metadata = json.load(f)
            return metadata
    except (json.JSONDecodeError, OSError):
        return {}


def get_image_attribution(filename: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Get attribution information for a specific image from metadata."""
    if not metadata or "images" not in metadata:
        return {}
    
    # Find the image in the metadata
    for image_info in metadata["images"]:
        if image_info.get("originalFile") == filename:
            attribution = image_info.get("attribution", {})
            return {
                "attribution": attribution,
                "source": image_info.get("source", ""),
                "isDefaultImage": image_info.get("isDefaultImage", False),
                "thumbnailFile": image_info.get("thumbnailFile", "")
            }
    
    return {}




def is_blacklisted(filename: str, blacklist: List[str]) -> bool:
    """Check if a filename is blacklisted, including base name and thumbnail matching."""
    # Direct filename match
    if filename in blacklist:
        return True
    
    # Get the base name (hash) of the current file
    if "_thumb" in filename:
        # For thumbnails, extract the base name without _thumb
        base_name = Path(filename.replace("_thumb", "")).stem
    else:
        # For regular files, get the base name
        base_name = Path(filename).stem
    
    # Check if any blacklisted file has the same base name (hash)
    for blacklisted_file in blacklist:
        blacklisted_base = Path(blacklisted_file).stem
        if base_name == blacklisted_base:
            return True
    
    return False


def list_directory_contents(dir_path: Path, ignore_patterns: List[str], blacklist: List[str] = None) -> List[Path]:
    """List contents of a directory, filtering out ignored and blacklisted items."""
    if not dir_path.exists() or not dir_path.is_dir():
        return []

    if blacklist is None:
        blacklist = []

    items = []
    for item in dir_path.iterdir():
        # Skip manifest.json, blacklist.json, and .git
        if item.name in ["manifest.json", "blacklist.json", ".git"]:
            continue

        # Check if item should be ignored
        if should_ignore(item, ignore_patterns):
            continue

        # Check if item is blacklisted (including base name matching)
        if is_blacklisted(item.name, blacklist):
            continue

        items.append(item)

    return sorted(items, key=lambda x: x.name.lower())


def generate_manifest(
    dir_path: Path, ignore_patterns: List[str], repo_root: Path
) -> None:
    """Generate manifest.json for a directory."""
    # Skip if this is a git directory
    if ".git" in str(dir_path):
        return

    manifest_file = dir_path / "manifest.json"
    
    # Load blacklist and metadata for this directory
    blacklist = load_blacklist(dir_path)
    metadata = load_metadata(dir_path)

    # Get the scientific name from the directory name
    scientific_name = dir_path.name

    # Get all image files in the directory
    images = []
    default_image_data = None
    default_image_filename = None
    
    if metadata and "defaultImage" in metadata:
        default_image_filename = metadata["defaultImage"]

    # Get directory contents
    items = list_directory_contents(dir_path, ignore_patterns, blacklist)

    # Process only image files (skip thumbnails)
    for item in items:
        if item.is_file() and item.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
            # Skip thumbnails
            if "_thumb" in item.name:
                continue
                
            # Get attribution information
            attribution_info = get_image_attribution(item.name, metadata)
            
            # Create image data with new format
            image_data = {
                "largeUrl": f"species-images/{scientific_name}/{item.name}",
                "attribution": attribution_info.get("attribution", {}),
                "source": attribution_info.get("source", "")
            }
            
            # Add preview URL if thumbnail exists
            thumbnail_file = attribution_info.get("thumbnailFile", "")
            if thumbnail_file:
                image_data["previewUrl"] = f"species-images/{scientific_name}/{thumbnail_file}"
            
            # Check if this is the default image
            if item.name == default_image_filename:
                default_image_data = image_data
            else:
                images.append(image_data)

    # Sort images by largeUrl
    images.sort(key=lambda x: x["largeUrl"])

    # Create manifest
    manifest = {
        "defaultImage": default_image_data,
        "images": images,
    }

    # Write manifest file
    with open(manifest_file, "w") as f:
        json.dump(manifest, f, indent=2)


def main():
    """Main function to generate manifests for species-images directories only."""
    try:
        # Get git repository root
        repo_root = get_git_root()

        # Load ignore patterns
        ignore_patterns = load_ignore_patterns(repo_root)

        # Only process the species-images directory
        species_images_dir = repo_root / "species-images"
        if not species_images_dir.exists():
            print("Error: species-images directory not found", file=sys.stderr)
            sys.exit(1)

        # Find all directories in the species-images folder
        directories = []
        for root, dirs, files in os.walk(species_images_dir):
            # Skip ignored directories
            dirs[:] = [
                d for d in dirs if not should_ignore(Path(root) / d, ignore_patterns)
            ]

            dir_path = Path(root)
            if not should_ignore(dir_path, ignore_patterns):
                directories.append(dir_path)

        # Generate manifests for all directories in species-images
        for dir_path in directories:
            generate_manifest(dir_path, ignore_patterns, repo_root)

        print(f"Generated manifest.json files for {len(directories)} directories in species-images")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    import sys

    main()
