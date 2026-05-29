with open("c:/Users/Hribhu/Downloads/Compution/src/components/AdminDashboard.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

output_lines = []
for idx in range(1310, min(1491, len(lines))):
    output_lines.append(f"{idx+1}: {lines[idx]}")

with open("c:/Users/Hribhu/Downloads/Compution/scratch/overview_tab.txt", "w", encoding="utf-8") as out:
    out.writelines(output_lines)

print("Saved overview_tab.txt successfully!")
