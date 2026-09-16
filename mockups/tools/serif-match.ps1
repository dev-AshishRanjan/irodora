# Render a word in each candidate serif and score it against a crop of a mockup by mask IoU.
#
# Candidates are the serifs INSTALLED on this machine, plus -- with -fontDir -- font files loaded from
# a directory without being installed (F-275). Loading from a file is what lets an open-licence face
# be measured here without changing the machine's font set, so the run is reproducible anywhere the
# same files are fetched.
param(
  [string]$img,
  [int]$x,
  [int]$y,
  [int]$w,
  [int]$h,
  [string]$word,
  [string]$polarity = 'light',
  [string]$fontDir = '',
  # How many rows to print. The default is a shortlist; a record wants the whole field.
  [int]$top = 12
)
Add-Type -AssemblyName System.Drawing
function MaskOf([System.Drawing.Bitmap]$b, [bool]$light, [int]$t) {
  $m = New-Object 'bool[,]' $b.Width, $b.Height
  for ($j = 0; $j -lt $b.Height; $j++) { for ($i = 0; $i -lt $b.Width; $i++) {
    $p = $b.GetPixel($i, $j); $s = [int]$p.R + $p.G + $p.B
    $m[$i, $j] = if ($light) { $s -ge $t } else { $s -le $t } } }
  return ,$m
}
function Bbox($m) {
  $W = $m.GetLength(0); $H = $m.GetLength(1); $x0 = $W; $y0 = $H; $x1 = -1; $y1 = -1
  for ($j = 0; $j -lt $H; $j++) { for ($i = 0; $i -lt $W; $i++) { if ($m[$i, $j]) {
    if ($i -lt $x0) { $x0 = $i }; if ($i -gt $x1) { $x1 = $i }; if ($j -lt $y0) { $y0 = $j }; if ($j -gt $y1) { $y1 = $j } } } }
  return @($x0, $y0, $x1, $y1)
}
function Sample($m, $bb, $Nc, $Mr) {
  $o = New-Object 'bool[,]' $Nc, $Mr; $bw = $bb[2] - $bb[0] + 1; $bh = $bb[3] - $bb[1] + 1
  for ($j = 0; $j -lt $Mr; $j++) { for ($i = 0; $i -lt $Nc; $i++) {
    $o[$i, $j] = $m[[int]($bb[0] + ($i + 0.5) * $bw / $Nc), [int]($bb[1] + ($j + 0.5) * $bh / $Mr)] } }
  return ,$o
}
$src = New-Object System.Drawing.Bitmap $img
$crop = $src.Clone((New-Object System.Drawing.Rectangle $x, $y, $w, $h), $src.PixelFormat)
$light = $polarity -eq 'light'
$tm = MaskOf $crop $light ($(if ($light) { 400 } else { 330 }))
$tb = Bbox $tm; $Nc = 160; $Mr = [int][Math]::Round(160 * ($tb[3] - $tb[1] + 1) / ($tb[2] - $tb[0] + 1)); if ($Mr -lt 8) { $Mr = 8 }
$ts = Sample $tm $tb $Nc $Mr
$aspect = ($tb[2] - $tb[0] + 1) / ($tb[3] - $tb[1] + 1)
$fams = 'Georgia','Georgia Pro','Georgia Pro Light','Times New Roman','Cambria','Constantia','Palatino Linotype','Book Antiqua','Bookman Old Style','Garamond','Baskerville Old Face','Bell MT','Bodoni MT','Calisto MT','Centaur','Century','Goudy Old Style','Lucida Bright','Sylfaen','Rockwell'

# The candidates: every installed family above, then every face loaded from -fontDir.
$candidates = @()
foreach ($f in $fams) { $candidates += [pscustomobject]@{ label = $f; family = $null; source = 'installed' } }

# A FACE THAT FAILS TO LOAD IS NAMED, NEVER SKIPPED QUIETLY: a candidate missing from the table
# would read as a candidate that scored badly, which is the one reading this must not produce.
$private = New-Object System.Drawing.Text.PrivateFontCollection
$failed = @()
if ($fontDir -ne '') {
  foreach ($file in Get-ChildItem -Path $fontDir -File -Recurse | Where-Object { $_.Extension -in '.ttf', '.otf' }) {
    $before = $private.Families.Count
    try { $private.AddFontFile($file.FullName) } catch { $failed += "$($file.Name): $($_.Exception.Message)"; continue }
    if ($private.Families.Count -eq $before) { $failed += "$($file.Name): loaded no new family (GDI+ refused it -- a variable font usually needs a static instance)" }
  }
  foreach ($fam in $private.Families) { $candidates += [pscustomobject]@{ label = $fam.Name; family = $fam; source = 'file' } }
}

$rows = @()
foreach ($c in $candidates) {
  if ($null -eq $c.family) {
    try { $font = New-Object System.Drawing.Font($c.label, 72, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel) } catch { continue }
    # GDI+ substitutes silently for a family that is not installed; the name check is what catches it.
    if ($font.Name -ne $c.label) { continue }
  }
  else {
    try { $font = New-Object System.Drawing.Font($c.family, 72, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel) } catch { $failed += "$($c.label): $($_.Exception.Message)"; continue }
  }
  $bmp = New-Object System.Drawing.Bitmap 1400, 200; $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Black); $g.TextRenderingHint = 'AntiAlias'
  $g.DrawString($word, $font, [System.Drawing.Brushes]::White, 10, 20); $g.Dispose()
  $rm = MaskOf $bmp $true 380; $rb = Bbox $rm; $rs = Sample $rm $rb $Nc $Mr
  $inter = 0; $union = 0
  for ($j = 0; $j -lt $Mr; $j++) { for ($i = 0; $i -lt $Nc; $i++) { $a = $ts[$i, $j]; $b = $rs[$i, $j]; if ($a -and $b) { $inter++ }; if ($a -or $b) { $union++ } } }
  $ra = ($rb[2] - $rb[0] + 1) / ($rb[3] - $rb[1] + 1)
  $rows += [pscustomobject]@{ face = $c.label; source = $c.source; iou = [Math]::Round($inter / [Math]::Max(1, $union), 3); aspect = [Math]::Round($ra, 2) }
  $bmp.Dispose()
}
"target aspect $([Math]::Round($aspect,2))  grid ${Nc}x${Mr}  candidates $($rows.Count) of $($candidates.Count)"
foreach ($f in $failed) { "COULD NOT MEASURE  $f" }
$rows | Sort-Object iou -Descending | Select-Object -First $top | ForEach-Object { "{0,-26} {1,-9} IoU {2}  aspect {3}" -f $_.face, $_.source, $_.iou, $_.aspect }
