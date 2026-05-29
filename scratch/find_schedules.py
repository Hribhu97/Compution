with open("c:/Users/Hribhu/Downloads/Compution/src/components/AdminDashboard.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

output = []
for idx, line in enumerate(lines):
    if "Schedule" in line or "schedule" in line or "Calendar" in line:
        output.append(f"{idx+1}: {line}")

with open("c:/Users/Hribhu/Downloads/Compution/scratch/schedule_lines.txt", "w", encoding="utf-8") as out:
    out.writelines(output)

print("Saved schedule_lines.txt successfully!")
