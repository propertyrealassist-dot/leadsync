#!/usr/bin/env python3
"""
Fix all db.prepare() calls to use async await db.run/get/all instead
"""

import re
import os
import glob

def fix_db_prepare_in_file(filepath):
    """Fix db.prepare patterns in a single file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes_made = []

    # Pattern 1: const stmt = db.prepare(query); stmt.get(...) -> const result = await db.get(query, [...])
    # Pattern 2: const stmt = db.prepare(query); stmt.run(...) -> await db.run(query, [...])
    # Pattern 3: const stmt = db.prepare(query); stmt.all(...) -> const results = await db.all(query, [...])
    # Pattern 4: db.prepare(query).get(...) -> await db.get(query, [...])
    # Pattern 5: db.prepare(query).run(...) -> await db.run(query, [...])
    # Pattern 6: db.prepare(query).all(...params) -> await db.all(query, params)

    # Fix inline patterns first: db.prepare(query).method(...args)
    # Fix .get()
    pattern = r'db\.prepare\(([^)]+)\)\.get\(([^)]*)\)'
    def replace_inline_get(match):
        query = match.group(1)
        args = match.group(2)
        if args.startswith('...'):
            # Spread operator - convert to array
            args_name = args[3:]  # Remove '...'
            return f'await db.get({query}, {args_name})'
        elif args:
            return f'await db.get({query}, [{args}])'
        else:
            return f'await db.get({query}, [])'

    new_content = re.sub(pattern, replace_inline_get, content)
    if new_content != content:
        changes_made.append("Fixed inline db.prepare().get()")
        content = new_content

    # Fix .run()
    pattern = r'db\.prepare\(([^)]+)\)\.run\(([^)]*)\)'
    def replace_inline_run(match):
        query = match.group(1)
        args = match.group(2)
        if args.startswith('...'):
            args_name = args[3:]
            return f'await db.run({query}, {args_name})'
        elif args:
            return f'await db.run({query}, [{args}])'
        else:
            return f'await db.run({query}, [])'

    new_content = re.sub(pattern, replace_inline_run, content)
    if new_content != content:
        changes_made.append("Fixed inline db.prepare().run()")
        content = new_content

    # Fix .all()
    pattern = r'db\.prepare\(([^)]+)\)\.all\(([^)]*)\)'
    def replace_inline_all(match):
        query = match.group(1)
        args = match.group(2)
        if args.startswith('...'):
            args_name = args[3:]
            return f'await db.all({query}, {args_name})'
        elif args:
            return f'await db.all({query}, [{args}])'
        else:
            return f'await db.all({query}, [])'

    new_content = re.sub(pattern, replace_inline_all, content)
    if new_content != content:
        changes_made.append("Fixed inline db.prepare().all()")
        content = new_content

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, changes_made

    return False, []

def main():
    # Find all JS files in routes and services
    routes_files = glob.glob('backend/src/routes/*.js')
    services_files = glob.glob('backend/src/services/*.js')

    all_files = routes_files + services_files
    # Exclude backup files
    all_files = [f for f in all_files if not f.endswith('.backup')]

    total_fixed = 0

    for filepath in all_files:
        fixed, changes = fix_db_prepare_in_file(filepath)
        if fixed:
            print(f"[OK] Fixed {filepath}")
            for change in changes:
                print(f"   - {change}")
            total_fixed += 1
        else:
            # Check if file has db.prepare that we couldn't auto-fix
            with open(filepath, 'r', encoding='utf-8') as f:
                if 'db.prepare' in f.read():
                    print(f"[WARN] {filepath} still has db.prepare() - needs manual review")

    print(f"\n[OK] Fixed {total_fixed} files")
    print("[WARN] Files with 'db.prepare' may need manual fixes for complex patterns")

if __name__ == '__main__':
    main()
