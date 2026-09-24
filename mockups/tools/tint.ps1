# ADR-0110 authoring helper - read-only measurement of a mockup render. Not a gate.
# The mean colour of the SATURATED pixels in a box: an icon's tint without the ground it sits on.
# Only pixels whose channel spread (max - min of R, G, B) is at least -minSpread are averaged,
# so a box that also holds the chip, the card or white text reports the icon's colour alone.
#   powershell -File mockups/tools/tint.ps1 -img mockups/07_wear_outfit_combinations.jpg -x 532 -y 626 -w 105 -h 41
param([string]$img, [int]$x, [int]$y, [int]$w, [int]$h, [int]$minSpread = 40)
Add-Type -AssemblyName System.Drawing
$b = New-Object System.Drawing.Bitmap $img
$r = 0; $g = 0; $bl = 0; $n = 0
for ($j = $y; $j -lt $y + $h; $j++) { for ($i = $x; $i -lt $x + $w; $i++) {
  $p = $b.GetPixel($i, $j)
  $mx = [Math]::Max($p.R, [Math]::Max($p.G, $p.B)); $mn = [Math]::Min($p.R, [Math]::Min($p.G, $p.B))
  if (($mx - $mn) -ge $minSpread) { $r += $p.R; $g += $p.G; $bl += $p.B; $n++ } } }
if ($n -eq 0) { "none"; exit }
'#{0:X2}{1:X2}{2:X2}  n={3}' -f [int]($r / $n), [int]($g / $n), [int]($bl / $n), $n
