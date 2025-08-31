# Qvittr Public Static

This repository contains static assets for the Qvittr project.

## Git Hook: Manifest Generation

A pre-commit git hook has been configured to automatically generate `manifest.json` files for each directory in the repository. This hook runs on every commit and creates comprehensive manifests that include:

### Manifest Structure

Each `manifest.json` file contains:

- **directory**: The full path to the directory
- **generated_at**: Timestamp when the manifest was generated
- **contents**: List of all files and subdirectories in the current directory
- **tree**: Complete tree structure of all files and subdirectories below the current directory

### File Information

For each file, the manifest includes:
- **type**: "file" or "directory"
- **path**: Full path to the file/directory
- **size**: File size in bytes (for files only)
- **modified**: Last modification timestamp in ISO format (for files only)

### How It Works

1. The pre-commit hook (`/.git/hooks/pre-commit`) runs automatically on every commit
2. It scans all directories in the repository
3. Generates a `manifest.json` file in each directory
4. Automatically adds new manifest files to the commit
5. Skips `.git` directories and existing `manifest.json` files to avoid recursion

### Example Manifest

```json
{
  "directory": "/path/to/directory",
  "generated_at": "2025-08-31T21:00:08Z",
  "contents": {
    "example.svg": {
      "type": "file",
      "path": "/path/to/directory/example.svg",
      "size": 790598,
      "modified": "2025-08-31T20:50:32Z"
    },
    "subdirectory": {
      "type": "directory",
      "path": "/path/to/directory/subdirectory"
    }
  },
  "tree": {
    "example.svg": {
      "type": "file",
      "path": "/path/to/directory/example.svg",
      "size": 790598,
      "modified": "2025-08-31T20:50:32Z"
    },
    "subdirectory": {
      "type": "directory",
      "path": "/path/to/directory/subdirectory",
      "contents": {
        "nested-file.txt": {
          "type": "file",
          "path": "/path/to/directory/subdirectory/nested-file.txt",
          "size": 123,
          "modified": "2025-08-31T20:50:32Z"
        }
      }
    }
  }
}
```

### Manual Execution

To manually run the manifest generation:

```bash
.git/hooks/pre-commit
```

This will generate manifests for all directories without committing.

### Ignoring Files and Directories

The hook supports ignoring files and directories using a `.manifest-ignore` file (similar to `.gitignore`). This file contains glob patterns for files and directories that should be excluded from manifests.

#### Ignore File Format

Create a `.manifest-ignore` file in the repository root:

```
# Ignore scripts folder
scripts/

# Ignore git-related files
.git/

# Ignore manifest files themselves
manifest.json

# Ignore common temporary files
*.tmp
*.temp
*~

# Ignore common build artifacts
node_modules/
dist/
build/
*.log
```

#### Supported Patterns

- **Directory patterns**: `scripts/` (ignores entire directory)
- **File patterns**: `*.log` (ignores all .log files)
- **Exact matches**: `manifest.json` (ignores specific files)
- **Comments**: Lines starting with `#` are ignored

## Version Controlling Git Hooks

Git hooks are stored in `.git/hooks` and are not automatically version controlled. To version control your hooks:

### Setup (First Time)

1. **Install hooks** (run this after cloning the repository):
   ```bash
   ./scripts/install-hooks.sh
   ```

2. **Verify installation**:
   ```bash
   ls -la .git/hooks/ | grep pre-commit
   ```

### Hook Management

- **Source location**: `scripts/hooks/` (version controlled)
- **Target location**: `.git/hooks/` (not version controlled)
- **Installation script**: `scripts/install-hooks.sh`

### Adding New Hooks

1. Create your hook in `scripts/hooks/`
2. Make it executable: `chmod +x scripts/hooks/your-hook-name`
3. Run the install script: `./scripts/install-hooks.sh`
4. Commit the new hook to version control

### Alternative: Using Git Hooks Manager

For more advanced hook management, consider using tools like:
- [husky](https://github.com/typicode/husky) (Node.js)
- [pre-commit](https://pre-commit.com/) (Python)
- [lefthook](https://github.com/evilmartians/lefthook) (Go)
# Test
test
test2
