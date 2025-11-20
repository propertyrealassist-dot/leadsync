import os
import re

def fix_bracket_issues(file_path):
    """Fix misplaced brackets in JavaScript files"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Fix JSON.stringify(something]) -> JSON.stringify(something)
    content = re.sub(r'JSON\.stringify\(([^)]+)\]\)', r'JSON.stringify(\1)', content)

    # Fix uuidv4(]) -> uuidv4()
    content = re.sub(r'uuidv4\(\]\)', r'uuidv4()', content)

    # Fix Date.now(]) -> Date.now()
    content = re.sub(r'Date\.now\(\]\)', r'Date.now()', content)

    # Fix new Date(]) -> new Date()
    content = re.sub(r'new Date\(\]\)', r'new Date()', content)

    # Fix patterns like ], [something]); at end of db.run/get/all calls
    # This is trickier - we need to find db method calls ending with ]); and change to ])];
    content = re.sub(r'(\s+\]\s*,\s*\[[^\]]+\])\);', r'\1]);', content)

    # Another pattern: something], param); -> something, param]);
    content = re.sub(r'(\S+)\]\s*,\s*([^)]+)\);', r'\1, \2]);', content)

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Files to fix
files_to_fix = [
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
    'src/services/ghlSender.js',
    'src/services/webhookProcessor.js',
    'src/services/appointmentAI.js',
    'src/services/ghlService.js',
    'src/services/conversationEngine.js',
]

for file_path in files_to_fix:
    full_path = os.path.join('C:\\Users\\Kurtv\\Desktop\\leadsync\\backend', file_path)
    if os.path.exists(full_path):
        if fix_bracket_issues(full_path):
            print(f'Fixed: {file_path}')
        else:
            print(f'No changes: {file_path}')
    else:
        print(f'Not found: {file_path}')
