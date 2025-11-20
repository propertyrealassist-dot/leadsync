import os
import re

def fix_bracket_issues(file_path):
    """Fix misplaced brackets in JavaScript files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f'Error reading {file_path}: {e}')
        return False

    original_content = content
    changes = []

    # Fix 1: uuidv4(]) -> uuidv4()
    pattern1 = r'uuidv4\(\]\)'
    if re.search(pattern1, content):
        content = re.sub(pattern1, 'uuidv4()', content)
        changes.append('Fixed uuidv4(])')

    # Fix 2: Date.now(]) -> Date.now()
    pattern2 = r'Date\.now\(\]\)'
    if re.search(pattern2, content):
        content = re.sub(pattern2, 'Date.now()', content)
        changes.append('Fixed Date.now(])')

    # Fix 3: new Date(]) -> new Date()
    pattern3 = r'new Date\(\]\)'
    if re.search(pattern3, content):
        content = re.sub(pattern3, 'new Date()', content)
        changes.append('Fixed new Date(])')

    # Fix 4: JSON.stringify(something]) -> JSON.stringify(something)
    # Be careful to only match the closing bracket of JSON.stringify, not array brackets
    pattern4 = r'JSON\.stringify\(([^)]+)\]\)'
    if re.search(pattern4, content):
        content = re.sub(pattern4, r'JSON.stringify(\1)', content)
        changes.append('Fixed JSON.stringify(...]])')

    # Fix 5: (Copy]) -> (Copy)
    pattern5 = r'\(Copy\]\)'
    if re.search(pattern5, content):
        content = re.sub(pattern5, '(Copy)', content)
        changes.append('Fixed (Copy])')

    if content != original_content:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'[OK] Fixed {file_path}')
            for change in changes:
                print(f'   - {change}')
            return True
        except Exception as e:
            print(f'[ERROR] Error writing {file_path}: {e}')
            return False
    else:
        print(f'[SKIP] No changes needed: {file_path}')
        return False

# All JavaScript files in the backend
files_to_check = [
    'src/routes/leads.js',
    'src/routes/templates.js',
    'src/routes/conversations.js',
    'src/routes/appointments.js',
    'src/routes/ghl.js',
    'src/routes/webhooks.js',
    'src/routes/webhook-ghl.js',
    'src/routes/booking.js',
    'src/routes/calendar.js',
    'src/routes/analytics.js',
    'src/routes/snapshots.js',
    'src/routes/passwordReset.js',
    'src/routes/auth.js',
    'src/services/ghlSender.js',
    'src/services/webhookProcessor.js',
    'src/services/appointmentAI.js',
    'src/services/ghlService.js',
    'src/services/conversationEngine.js',
    'src/middleware/auth.js',
]

base_path = r'C:\Users\Kurtv\Desktop\leadsync\backend'
fixed_count = 0
not_found_count = 0

print('=' * 60)
print('FIXING BRACKET PLACEMENT ISSUES')
print('=' * 60)

for file_path in files_to_check:
    full_path = os.path.join(base_path, file_path)
    if os.path.exists(full_path):
        if fix_bracket_issues(full_path):
            fixed_count += 1
    else:
        print(f'[WARN] Not found: {file_path}')
        not_found_count += 1

print('=' * 60)
print(f'SUMMARY: Fixed {fixed_count} files, {not_found_count} not found')
print('=' * 60)
