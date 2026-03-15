import re

with open('app/agent/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove CountdownTimer component and LAUNCH_DATE logic
content = re.sub(r'// ─── COUNTDOWN TARGET.*?// ─── TAGLINES', '// ─── TAGLINES', content, flags=re.DOTALL)
content = re.sub(r'// ─── COUNTDOWN COMPONENT.*?// ─── MARQUEE COMPONENT', '// ─── MARQUEE COMPONENT', content, flags=re.DOTALL)

# 2. Update Hero text
content = content.replace('PROJECT CLASSIFIED · COMING SOON', 'PROJECT CLASSIFIED · EARLY ACCESS')
content = content.replace('IS COMING.', 'IS READY FOR EARLY ACCESS.')

# 3. Rearrange sections 
# Extract sections by their headers
def extract_section(text, sec_marker):
    start = text.find(sec_marker)
    if start == -1: return "", text
    next_sec_match = re.search(r'{/\* ════════', text[start + len(sec_marker):])
    end = start + len(sec_marker) + next_sec_match.start() if next_sec_match else len(text)
    
    # Check if Footer is next
    footer_match = re.search(r'{/\* ════════.*?FOOTER', text[start + len(sec_marker):])
    if footer_match and next_sec_match and footer_match.start() == next_sec_match.start():
        end = start + len(sec_marker) + footer_match.start()
        
    return text[start:end], text[:start] + text[end:]

sec2_marker = '{/* ═══════════════════════════════════════════════════════════════════\n          SECTION 2: THE COUNTDOWN\n      ═══════════════════════════════════════════════════════════════════ */}'
sec6_marker = '{/* ═══════════════════════════════════════════════════════════════════\n          SECTION 6: EARLY ACCESS CTA\n      ═══════════════════════════════════════════════════════════════════ */}'
sec3_marker = '{/* ═══════════════════════════════════════════════════════════════════\n          SECTION 3: WHAT IT DOES (Capabilities Grid)\n      ═══════════════════════════════════════════════════════════════════ */}'

sec2, content_no_sec2 = extract_section(content, sec2_marker)
sec6, content_no_sec26 = extract_section(content_no_sec2, sec6_marker)

# Insert sec6 where sec2 used to be (before sec3)
insert_pos = content_no_sec26.find(sec3_marker)

final_content = content_no_sec26[:insert_pos] + sec6 + content_no_sec26[insert_pos:]

with open('app/agent/page.tsx', 'w', encoding='utf-8') as f:
    f.write(final_content)
print("Done")
