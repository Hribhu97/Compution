import re

with open("c:/Users/Hribhu/Downloads/Compution/src/components/AdminDashboard.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Search for activePanelTab checks in JSX
for idx, line in enumerate(lines):
    match = re.search(r"activePanelTab\s*===?\s*['\"](\w+)['\"]", line)
    if match:
        print(f"Line {idx+1}: Found check for activePanelTab == '{match.group(1)}'")
