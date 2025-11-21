import json
import urllib.request
import re
from datetime import datetime
import os

REPO_OWNER = 'Liiesl'
REPO_NAME = 'EasyScanlate'
API_URL = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases"

def fetch_releases():
    try:
        # Add User-Agent to avoid 403 Forbidden from GitHub API
        req = urllib.request.Request(
            API_URL, 
            data=None, 
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                print(f"Error: HTTP {response.status}")
                return []
            data = response.read()
            return json.loads(data)
    except Exception as e:
        print(f"Error fetching releases: {e}")
        return []

def parse_list_items(text):
    items = []
    for line in text.split('\n'):
        line = line.strip()
        if line.startswith('-'):
            items.append(line[1:].strip())
    return items

def parse_release_body(body):
    sections = {
        'warning': None,
        'added': [],
        'changed': [],
        'fixed': []
    }
    
    if not body:
        return sections
        
    # Normalize newlines
    body = body.replace('\r\n', '\n')
    
    # Split by ### header
    raw_sections = re.split(r'^### ', body, flags=re.MULTILINE)
    
    for section in raw_sections:
        if not section.strip():
            continue
            
        lines = section.strip().split('\n')
        header = lines[0].strip().lower()
        content = '\n'.join(lines[1:]).strip()
        
        if 'after installation' in header or 'antivirus' in header:
            continue
        elif header.startswith('added'):
            sections['added'] = parse_list_items(content)
        elif header.startswith('changed'):
            sections['changed'] = parse_list_items(content)
        elif header.startswith('fixed'):
            sections['fixed'] = parse_list_items(content)
            
    return sections

def format_date(date_str):
    try:
        # Handle Z for UTC
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime('%B %d, %Y')
    except:
        return date_str

def generate_html(releases):
    html_parts = []
    base_indent = " " * 16  # Inside releases-container (which is at 12 spaces)
    
    for release in releases:
        tag_name = release.get('tag_name', '')
        published_at = release.get('published_at', '')
        body = release.get('body', '')
        
        sections = parse_release_body(body)
        
        version_display = tag_name
        if version_display.startswith('v'):
            version_display = version_display[1:]
            
        date_display = format_date(published_at)
        
        # Start article
        article_lines = [
            f'{base_indent}<article class="release-version">',
            f'{base_indent}    <h2>Version {version_display}</h2>',
            f'{base_indent}    <time datetime="{published_at}">{date_display}</time>'
        ]
        
        changelog_items = []
        
        def add_items(items, type_class, label):
            for item in items:
                item_safe = item.replace('<', '&lt;').replace('>', '&gt;')
                changelog_items.append(f'{base_indent}        <li><span class="tag {type_class}">{label}</span> {item_safe}</li>')

        if sections['added']:
            add_items(sections['added'], 'new', 'New')
        if sections['changed']:
            add_items(sections['changed'], 'improved', 'Changed')
        if sections['fixed']:
            add_items(sections['fixed'], 'fixed', 'Fixed')
            
        if changelog_items:
            article_lines.append(f'{base_indent}    <ul class="changelog">')
            article_lines.extend(changelog_items)
            article_lines.append(f'{base_indent}    </ul>')
            
        article_lines.append(f'{base_indent}</article>')
        html_parts.append('\n'.join(article_lines))
        
    return '\n'.join(html_parts)

def update_file(html_content):
    # Adjust path to be relative to where script is run or absolute
    # Assuming script is run from project root
    file_path = os.path.join('v2', 'releases.html')
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Regex to replace content inside releases-container
    pattern = r'(<div id="releases-container" class="releases-list">)(.*?)(</div>)'
    
    new_content = re.sub(
        pattern,
        f'\\1\n{html_content}\n            \\3',
        content,
        flags=re.DOTALL
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {file_path}")

if __name__ == "__main__":
    print("Fetching releases...")
    releases = fetch_releases()
    if releases:
        print(f"Found {len(releases)} releases.")
        html = generate_html(releases)
        update_file(html)
        print("Done.")
    else:
        print("No releases found or error occurred.")
