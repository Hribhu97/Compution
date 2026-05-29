with open("c:/Users/Hribhu/Downloads/Compution/src/components/AdminDashboard.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "studentSchedules" in line or "studentCalendar" in line:
        print(f"{idx+1}: {line.strip()}")
