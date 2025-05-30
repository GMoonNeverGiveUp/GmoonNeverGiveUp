#!/usr/bin/env python3
"""
export_codebase_to_md.py  –  snapshot an entire codebase into one Markdown file.

FEATURES
  • Streams every text file into a single Markdown (`CODEBASE_SNAPSHOT.md`).
  • Pretty ASCII directory tree.
  • `.snapshotignore` (git-ignore-style) patterns to keep the dump lean.
  • Hard-coded skips for node_modules, .git, virtual envs – at ANY depth.
  • Per-file size cap (default 5 MiB; override with --max-mb).
  • Pure standard library – runs instantly in Codespaces / bare Python.

USAGE
  python export_codebase_to_md.py              # scan pwd, default settings
  python export_codebase_to_md.py src -o out.md
  python export_codebase_to_md.py -I ignore.lst --max-mb 1
"""

from __future__ import annotations
import argparse, fnmatch, mimetypes, os, pathlib, sys
from typing import List

# ────────────────────────────────────── configuration
LANG_MAP = {
    '.py': 'python', '.js': 'javascript', '.ts': 'typescript', '.tsx': 'tsx',
    '.jsx': 'jsx', '.sol': 'solidity', '.rs': 'rust', '.go': 'go',
    '.java': 'java', '.kt': 'kotlin', '.cs': 'csharp', '.c': 'c',
    '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp', '.html': 'html',
    '.css': 'css', '.json': 'json', '.yml': 'yaml', '.yaml': 'yaml',
    '.sh': 'bash', '.sql': 'sql', '.md': 'markdown',
}

DEFAULT_SKIP_DIRS = {
    '.git', '.hg', '.svn',
    'node_modules', '.venv', '.env',
    '__pycache__',
}

DEFAULT_MAX_MB = 5          # per-file size ceiling

# ────────────────────────────────────── ignore-file helpers
def load_ignore_list(root: pathlib.Path, filename: str) -> List[str]:
    """Read ignore patterns from file (blank & #comment lines ignored)."""
    path = root / filename
    if not path.exists():
        return []
    patterns: List[str] = []
    for raw in path.read_text(encoding='utf-8', errors='ignore').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.endswith('/'):
            patterns.append(os.path.join(line, '**'))
        else:
            patterns.append(line)
    return patterns

def should_ignore(rel: str, patterns: List[str]) -> bool:
    return any(fnmatch.fnmatch(rel, pat) for pat in patterns)

def is_under_skip_dir(path: pathlib.Path) -> bool:
    """True iff any part of the path matches a dir in DEFAULT_SKIP_DIRS."""
    return any(part in DEFAULT_SKIP_DIRS for part in path.parts)

# ────────────────────────────────────── dir-tree rendering
def tree_lines(root: pathlib.Path, ignore: List[str]) -> List[str]:
    """Return lines for an ASCII tree, respecting skip / ignore logic."""
    lines, stack = [], [(root, 0)]
    while stack:
        directory, indent = stack.pop()
        try:
            entries = sorted(
                [p for p in directory.iterdir()
                 if not is_under_skip_dir(p)
                 and not should_ignore(p.relative_to(root).as_posix(), ignore)],
                key=lambda p: (p.is_file(), p.name.lower())
            )
        except PermissionError:
            continue
        for i, entry in enumerate(entries):
            lines.append(' ' * indent + ('└── ' if i == len(entries) - 1 else '├── ') + entry.name)
            if entry.is_dir():
                stack.append((entry, indent + 4))
    return lines

# ────────────────────────────────────── file helpers
def is_text_file(path: pathlib.Path) -> bool:
    mime, _ = mimetypes.guess_type(path.as_posix())
    return (mime and mime.startswith('text')) or path.suffix.lower() in LANG_MAP

# ────────────────────────────────────── core snapshot routine
def write_snapshot(root: pathlib.Path,
                   md_path: pathlib.Path,
                   ignore: List[str],
                   max_mb: int = DEFAULT_MAX_MB) -> None:
    with md_path.open('w', encoding='utf-8') as md:
        md.write(f'# Codebase Snapshot\n\n')
        md.write(f'*Root directory:* `{root}`\n\n')

        # Directory tree
        md.write('## Directory structure\n\n```text\n')
        md.writelines('\n'.join(tree_lines(root, ignore)))
        md.write('\n```\n\n')

        # Files
        md.write('## Files\n\n')
        for path in sorted(root.rglob('*')):
            rel = path.relative_to(root).as_posix()

            # skip logic
            if path.is_dir():
                continue
            if is_under_skip_dir(path):
                continue
            if should_ignore(rel, ignore):
                continue
            try:
                if path.stat().st_size > max_mb * 1024 * 1024:
                    continue
            except FileNotFoundError:
                # disappeared since the directory walk or broken symlink
                continue

            if not is_text_file(path):
                continue

            lang = LANG_MAP.get(path.suffix.lower(), '')
            md.write(f'### {rel}\n\n```{lang}\n')
            try:
                # stream line-by-line for memory safety
                with path.open('r', encoding='utf-8', errors='replace') as f:
                    for line in f:
                        md.write(line.rstrip('\n') + '\n')
            except Exception:
                md.write('<!-- unable to read file -->\n')
            md.write('```\n\n')

# ────────────────────────────────────── command-line interface
def main(argv: List[str] | None = None):
    p = argparse.ArgumentParser(description='Export codebase snapshot as Markdown.')
    p.add_argument('root', nargs='?', default='.',
                   help='root directory (default: current working dir)')
    p.add_argument('-o', '--output', default='CODEBASE_SNAPSHOT.md',
                   help='output Markdown file (default: CODEBASE_SNAPSHOT.md)')
    p.add_argument('-I', '--ignore-file', default='.snapshotignore',
                   help='ignore list file (default: .snapshotignore)')
    p.add_argument('--max-mb', type=int, default=DEFAULT_MAX_MB,
                   help=f'max file size in MiB (default: {DEFAULT_MAX_MB})')
    args = p.parse_args(argv)

    root = pathlib.Path(args.root).resolve()
    if not root.exists():
        sys.exit(f'Root directory {root} does not exist.')

    ignore_patterns = load_ignore_list(root, args.ignore_file)
    out = pathlib.Path(args.output).resolve()

    write_snapshot(root, out, ignore_patterns, args.max_mb)
    print(f'✅ Snapshot written to {out}')

if __name__ == '__main__':
    main()
