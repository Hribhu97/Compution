$f = "src\pages\dashboard\WorldCupPage.jsx"
$bytes = [System.IO.File]::ReadAllBytes($f)
$c = [System.Text.Encoding]::UTF8.GetString($bytes)

# Fix broken emojis in lobby dressing room header
$c = $c.Replace("ðŸ›¡ï¸ Squad Dressing Room", "Squad Dressing Room")
$c = $c.Replace("ðŸŽ¯ Top 5 Campus Objective", "★ Top 5 Campus Objective")

# Fix captain crown in dressing room seat
$c = $c.Replace("<span title=`"Captain`">ðŸ''</span>", "<span title=`"Captain`" style=`"color:#FEDF00`">★</span>")

# Fix empty seat ghost person emoji  
$oldSeat = "background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '1.3rem' }}>
                          ðŸ'¤"
$newSeat = "background: 'rgba(255,255,255,0.01)', border: '1.5px dashed rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
                          ?"
$c = $c.Replace($oldSeat, $newSeat)

# Fix chat tab labels - use byte-safe replacements
# Find broken sequences and replace with clean text
$broken1 = [byte[]]@(0xc3, 0xb0, 0xc5, 0xb8, 0xe2, 0x80, 0x9a, 0xc2, 0xac)  # ðŸ'¬
$clean1 = [System.Text.Encoding]::UTF8.GetBytes("Chat")
# Replace tab labels with clean versions
$c = $c.Replace("ðŸ'¬ Dressing Chat", "Dressing Chat")
$c = $c.Replace("ðŸ"Š Campus Standings", "Campus Standings")

# Fix chat empty state
$c = $c.Replace("ðŸ'‹ Chat room is empty", "Chat room is empty")

# Fix Play button
$c = $c.Replace("âš½ Play Today", "⚽ Play Today")

# Write back
[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "Done - fixed all broken emojis"
