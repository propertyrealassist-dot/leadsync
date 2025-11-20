#!/usr/bin/env python3
"""
Database Call Converter for LeadSync Migration
Converts synchronous SQLite calls to async PostgreSQL-compatible calls
"""

import re
import sys
from pathlib import Path

def convert_db_import(content):
    """Convert database import statement"""
    content = re.sub(
        r"const db = require\(['\"]\.\.\/database\/db['\"]\);?",
        "const { db } = require('../config/database');",
        content
    )
    return content

def convert_db_calls(content):
    """Convert db.prepare(...).get/all/run(...) to await db.get/all/run(..., [...])"""

    # Pattern for .get()
    def replace_get(match):
        query = match.group(1)
        params = match.group(2).strip() if match.group(2) else ""
        if params:
            return f"await db.get({query}, [{params}])"
        else:
            return f"await db.get({query}, [])"

    content = re.sub(
        r"db\.prepare\(((?:'[^']*'|\"[^\"]*\"|`[^`]*`))\)\.get\(([^)]*)\)",
        replace_get,
        content
    )

    # Pattern for .all()
    def replace_all(match):
        query = match.group(1)
        params = match.group(2).strip() if match.group(2) else ""
        if params:
            return f"await db.all({query}, [{params}])"
        else:
            return f"await db.all({query}, [])"

    content = re.sub(
        r"db\.prepare\(((?:'[^']*'|\"[^\"]*\"|`[^`]*`))\)\.all\(([^)]*)\)",
        replace_all,
        content
    )

    # Pattern for .run()
    def replace_run(match):
        query = match.group(1)
        params = match.group(2).strip() if match.group(2) else ""
        if params:
            return f"await db.run({query}, [{params}])"
        else:
            return f"await db.run({query}, [])"

    content = re.sub(
        r"db\.prepare\(((?:'[^']*'|\"[^\"]*\"|`[^`]*`))\)\.run\(([^)]*)\)",
        replace_run,
        content
    )

    return content

def make_handlers_async(content):
    """Ensure route handlers are async"""

    # router.METHOD('/path', (req, res) => {
    content = re.sub(
        r"router\.(get|post|put|patch|delete)\(([^,]+),\s*(?!async)\((req,\s*res(?:,\s*next)?)\)\s*=>\s*{",
        r"router.\1(\2, async (\3) => {",
        content
    )

    # router.METHOD('/path', middleware, (req, res) => {
    content = re.sub(
        r"router\.(get|post|put|patch|delete)\(([^,]+),\s*([^,]+),\s*(?!async)\((req,\s*res(?:,\s*next)?)\)\s*=>\s*{",
        r"router.\1(\2, \3, async (\4) => {",
        content
    )

    return content

def convert_file(file_path):
    """Convert a single file"""
    print(f"Converting {file_path}...")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Apply conversions
        content = convert_db_import(content)
        content = convert_db_calls(content)
        content = make_handlers_async(content)

        if content == original:
            print(f"[OK] {file_path} - No changes needed")
            return False

        # Create backup
        backup_path = f"{file_path}.backup"
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(original)

        # Write converted file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"[DONE] {file_path} - Converted successfully (backup created)")
        return True

    except Exception as e:
        print(f"[ERROR] Error converting {file_path}: {e}")
        return False

def main():
    """Main conversion process"""
    base_path = Path(__file__).parent / 'src'

    files_to_convert = [
        'routes/templates.js',
        'routes/conversations.js',
        'routes/appointments.js',
        'routes/ghl.js',
        'routes/webhooks.js',
        'routes/webhook-ghl.js',
        'routes/leads.js',
        'routes/booking.js',
        'routes/calendar.js',
        'routes/analytics.js',
        'routes/snapshots.js',
        'routes/passwordReset.js',
        'routes/ai.js',
        'routes/test-ai.js',
        'services/ghlSender.js',
        'services/webhookProcessor.js',
        'services/appointmentAI.js',
        'services/ghlService.js',
        'services/conversationEngine.js'
    ]

    print("Starting database call conversion...\n")

    converted = 0
    skipped = 0

    for file in files_to_convert:
        file_path = base_path / file
        if file_path.exists():
            if convert_file(file_path):
                converted += 1
            else:
                skipped += 1
        else:
            print(f"[SKIP] Skipping {file} (not found)")
            skipped += 1

    print(f"\nConversion Summary:")
    print(f"   Converted: {converted}")
    print(f"   Skipped: {skipped}")
    print(f"\nBackup files created with .backup extension")

if __name__ == '__main__':
    main()
