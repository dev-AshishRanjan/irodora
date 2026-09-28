# Read how heavy a line of drawn type is, in a way JPEG bloom and antialiasing do not change (F-226).
#
# THE QUANTITY. Along a horizontal band through the word, the INTEGRAL of ink coverage across the row
# is the total width of ink the band crosses, in pixels. Blur spreads a stem sideways but keeps its
# integral, so the number survives the render's softening where a thresholded width would not.
# Dividing by the word's ink height (top and bottom read at the 50 % crossing, which a symmetric blur
# also leaves in place) makes it independent of the size the word was drawn at. The same number is
# computed EXACTLY from a font's outlines by serif-weight.mjs, at any weight, so the two meet on the
# weight the drawing was set in.
#
# Coverage is (value - ground) / (ink - ground), read in encoded sRGB and in linear light: which one a
# renderer blended in is not known, so both are reported and the difference is part of the error.
#
# MODES
#   measure (default)  a crop of an image, as serif-match.ps1 takes it
#   -render            set -word in -fontFile at -emPx, save it as a JPEG at -quality, then measure
#                      that image: the calibration run, where the weight is known in advance
#
# Prints one line of JSON. ASCII only: Windows PowerShell reads a .ps1 without a BOM as ANSI.
param(
  [string]$img = '',
  [int]$x = 0,
  [int]$y = 0,
  [int]$w = 0,
  [int]$h = 0,
  [string]$polarity = 'light',
  [string]$fractions = '0.25,0.35,0.45,0.55',
  [double]$band = 0.04,
  [string]$groundHex = '',
  [string]$inkHex = '',
  [switch]$render,
  [string]$fontFile = '',
  [string]$word = '',
  [double]$emPx = 0,
  [string]$out = '',
  [int]$quality = 85,
  # The word as hex codepoints, for a word outside ASCII (a command line may not carry it intact).
  [string]$codepoints = ''
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function HexColor([string]$hex) {
  $v = $hex.TrimStart('#')
  return [System.Drawing.Color]::FromArgb([Convert]::ToInt32($v.Substring(0, 2), 16), [Convert]::ToInt32($v.Substring(2, 2), 16), [Convert]::ToInt32($v.Substring(4, 2), 16))
}
function Lin([double]$c) { if ($c -le 0.04045) { return $c / 12.92 } return [Math]::Pow(($c + 0.055) / 1.055, 2.4) }
# Luminance of one pixel: encoded luma and linear luminance, both Rec. 709 weights.
function Lum([System.Drawing.Color]$p) {
  $r = $p.R / 255.0; $g = $p.G / 255.0; $b = $p.B / 255.0
  return @((0.2126 * $r + 0.7152 * $g + 0.0722 * $b), (0.2126 * (Lin $r) + 0.7152 * (Lin $g) + 0.0722 * (Lin $b)))
}

if ($codepoints -ne '') { $word = [string]::Join('', ($codepoints -split ',' | ForEach-Object { [char]::ConvertFromUtf32([Convert]::ToInt32($_.Trim(), 16)) })) }
if ($render) {
  if (-not (Test-Path -LiteralPath $fontFile)) { Write-Error "no font at $fontFile"; exit 2 }
  if ($word -eq '' -or $emPx -le 0 -or $out -eq '') { Write-Error '-render needs -word, -emPx and -out'; exit 2 }
  $pfc = New-Object System.Drawing.Text.PrivateFontCollection
  $pfc.AddFontFile((Resolve-Path -LiteralPath $fontFile).Path)
  if ($pfc.Families.Count -ne 1) { Write-Error "GDI+ exposed $($pfc.Families.Count) families from $fontFile"; exit 2 }
  $font = New-Object System.Drawing.Font($pfc.Families[0], [single]$emPx, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $RW = [int]([Math]::Ceiling($emPx * ($word.Length + 2))); $RH = [int]([Math]::Ceiling($emPx * 2))
  $bmp = New-Object System.Drawing.Bitmap $RW, $RH
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $ground = if ($groundHex -ne '') { HexColor $groundHex } else { if ($polarity -eq 'light') { HexColor '#16181C' } else { HexColor '#F6F5F2' } }
  $ink = if ($inkHex -ne '') { HexColor $inkHex } else { if ($polarity -eq 'light') { HexColor '#F7F8FA' } else { HexColor '#1A1B1E' } }
  $gfx.Clear($ground); $gfx.TextRenderingHint = 'AntiAlias'
  $brush = New-Object System.Drawing.SolidBrush $ink
  $gfx.DrawString($word, $font, $brush, [single]($emPx * 0.5), [single]($emPx * 0.3)); $gfx.Dispose()
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
  $bmp.Save($out, $codec, $params); $bmp.Dispose()
  $img = $out; $x = 0; $y = 0; $w = $RW; $h = $RH
  if ($groundHex -eq '') { $groundHex = '#{0:X2}{1:X2}{2:X2}' -f $ground.R, $ground.G, $ground.B }
  if ($inkHex -eq '') { $inkHex = '#{0:X2}{1:X2}{2:X2}' -f $ink.R, $ink.G, $ink.B }
}

if (-not (Test-Path -LiteralPath $img)) { Write-Error "no image at $img"; exit 2 }
$src = New-Object System.Drawing.Bitmap $img
if ($w -le 0 -or $h -le 0 -or ($x + $w) -gt $src.Width -or ($y + $h) -gt $src.Height) { Write-Error "crop $x,$y ${w}x$h is outside the ${($src.Width)}x$($src.Height) image"; exit 2 }
$light = $polarity -eq 'light'

# Luminance planes, [space][i, j] with space 0 encoded, 1 linear.
$L0 = New-Object 'double[,]' $w, $h; $L1 = New-Object 'double[,]' $w, $h
for ($j = 0; $j -lt $h; $j++) { for ($i = 0; $i -lt $w; $i++) {
  $v = Lum ($src.GetPixel($x + $i, $y + $j)); $L0[$i, $j] = $v[0]; $L1[$i, $j] = $v[1] } }
$L = @($L0, $L1)
$src.Dispose()

# Ground: the median of the crop's one-pixel frame, unless given. Ink: the 99.5th percentile toward the
# ink side, unless given -- at small sizes a thin stem never reaches full ink, so -inkHex should be the
# drawn text colour whenever it is known.
function Median([double[]]$a) { $s = $a | Sort-Object; return $s[[int]($s.Count / 2)] }
$refs = @()
foreach ($space in 0, 1) {
  $P = $L[$space]
  $frame = New-Object System.Collections.Generic.List[double]
  for ($i = 0; $i -lt $w; $i++) { $a = $P[$i, 0]; $b = $P[$i, ($h - 1)]; $frame.Add($a); $frame.Add($b) }
  for ($j = 0; $j -lt $h; $j++) { $a = $P[0, $j]; $b = $P[($w - 1), $j]; $frame.Add($a); $frame.Add($b) }
  $g = if ($groundHex -ne '') { (Lum (HexColor $groundHex))[$space] } else { Median $frame.ToArray() }
  if ($inkHex -ne '') { $k = (Lum (HexColor $inkHex))[$space] }
  else {
    $all = New-Object System.Collections.Generic.List[double]
    for ($j = 0; $j -lt $h; $j++) { for ($i = 0; $i -lt $w; $i++) { $a = $P[$i, $j]; $all.Add($a) } }
    $s = $all.ToArray() | Sort-Object
    $k = if ($light) { $s[[int](($s.Count - 1) * 0.995)] } else { $s[[int](($s.Count - 1) * 0.005)] }
  }
  if ([Math]::Abs($k - $g) -lt 0.05) { Write-Error "ink and ground are indistinguishable in space $space ($g vs $k)"; exit 2 }
  $refs += , @($g, $k)
}

$result = [ordered]@{ img = $img; crop = @($x, $y, $w, $h); polarity = $polarity; ground = $groundHex; ink = $inkHex; spaces = [ordered]@{} }
foreach ($space in 0, 1) {
  $g = $refs[$space][0]; $k = $refs[$space][1]; $P = $L[$space]
  # PowerShell names are case-insensitive: the coverage plane and a scalar must not share a name.
  $Cov = New-Object 'double[,]' $w, $h
  for ($j = 0; $j -lt $h; $j++) { for ($i = 0; $i -lt $w; $i++) {
    $cv = ($P[$i, $j] - $g) / ($k - $g); if ($cv -lt 0) { $cv = 0 }; if ($cv -gt 1) { $cv = 1 }; $Cov[$i, $j] = $cv } }
  # Row and column maxima, and their 50 % crossings with sub-pixel interpolation.
  $rowMax = New-Object 'double[]' $h; $colMax = New-Object 'double[]' $w
  for ($j = 0; $j -lt $h; $j++) { for ($i = 0; $i -lt $w; $i++) {
    $cv = $Cov[$i, $j]; if ($cv -gt $rowMax[$j]) { $rowMax[$j] = $cv }; if ($cv -gt $colMax[$i]) { $colMax[$i] = $cv } } }
  function Crossing([double[]]$p, [bool]$fromStart) {
    $n = $p.Length
    if ($fromStart) { for ($t = 0; $t -lt $n; $t++) { if ($p[$t] -ge 0.5) { if ($t -eq 0) { return 0.0 }; return ($t - 1) + (0.5 - $p[$t - 1]) / ($p[$t] - $p[$t - 1]) + 0.5 } } }
    else { for ($t = $n - 1; $t -ge 0; $t--) { if ($p[$t] -ge 0.5) { if ($t -eq $n - 1) { return [double]$n }; return $t + ($p[$t] - 0.5) / ($p[$t] - $p[$t + 1]) + 0.5 } } }
    return [double]::NaN
  }
  $top = Crossing $rowMax $true; $bottom = Crossing $rowMax $false
  $left = Crossing $colMax $true; $right = Crossing $colMax $false
  if ([double]::IsNaN($top) -or [double]::IsNaN($left)) { Write-Error 'no ink crosses 50 % in this crop'; exit 2 }
  $inkH = $bottom - $top; $inkW = $right - $left
  # Ink width along each band, from the bottom of the ink box upward, averaged over sampled rows.
  $rows = @()
  foreach ($f in ($fractions -split ',' | ForEach-Object { [double]$_ })) {
    $sum = 0.0; $n = 0
    for ($s = -4; $s -le 4; $s++) {
      $yy = $bottom - ($f + $band * $s / 4) * $inkH - 0.5
      $j0 = [int][Math]::Floor($yy); $t = $yy - $j0
      if ($j0 -lt 0 -or $j0 + 1 -ge $h) { continue }
      $row = 0.0
      for ($i = 0; $i -lt $w; $i++) { $a = $Cov[$i, $j0]; $b = $Cov[$i, ($j0 + 1)]; $row += (1 - $t) * $a + $t * $b }
      $sum += $row; $n++
    }
    $rows += [ordered]@{ f = $f; ink = [Math]::Round($sum / [Math]::Max(1, $n), 3); r = [Math]::Round(($sum / [Math]::Max(1, $n)) / $inkH, 5) }
  }
  $result.spaces[$(if ($space -eq 0) { 'encoded' } else { 'linear' })] = [ordered]@{ height = [Math]::Round($inkH, 3); width = [Math]::Round($inkW, 3); aspect = [Math]::Round($inkW / $inkH, 4); bands = $rows }
}
$result | ConvertTo-Json -Depth 6 -Compress
