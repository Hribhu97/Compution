with open("c:/Users/Hribhu/Downloads/Compution/src/components/AdminDashboard.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx in range(1249, min(1350, len(lines))):
    print(f"{idx+1}: {lines[idx]}", end="")
