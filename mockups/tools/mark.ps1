# Read a drawn mark's pixels, or round-trip a synthetic one through JPEG (F-230).
#
# The fitting is mark-fit.mjs's: this helper only moves pixels, so the geometry and its point test
# live in one place. Luminance is Rec. 709's weights over the ENCODED channels, 0 to 255: coverage is
# read as a fraction between the local ground and the ink, which an affine change of scale leaves
# alone.
#
# MODES
#   dump (default)  -img -x -y -w -h -out   a crop's luminance as JSON {x, y, w, h, lum: [row, ...]}
#   -jpeg           -in -out -dump -quality  a luminance grid (the same JSON) drawn as a grey bitmap,
#                                            saved as a JPEG at -quality, read back and dumped: the
#                                            calibration's render path, as stem.ps1 -render is
#
# ASCII only: Windows PowerShell reads a .ps1 without a BOM as ANSI.
param(
  [string]$img = '',
  [int]$x = 0,
  [int]$y = 0,
  [int]$w = 0,
  [int]$h = 0,
  [string]$out = '',
  [switch]$jpeg,
  [string]$in = '',
  [string]$dump = '',
  [int]$quality = 85
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Dump-Bitmap([System.Drawing.Bitmap]$b, [int]$x0, [int]$y0, [int]$ww, [int]$hh, [string]$path) {
  $rows = New-Object System.Collections.Generic.List[string]
  for ($j = 0; $j -lt $hh; $j++) {
    $vals = New-Object System.Collections.Generic.List[string]
    for ($i = 0; $i -lt $ww; $i++) {
      $c = $b.GetPixel($x0 + $i, $y0 + $j)
      $l = 0.2126 * $c.R + 0.7152 * $c.G + 0.0722 * $c.B
      $vals.Add([string]([math]::Round($l, 2)))
    }
    $rows.Add('[' + ($vals -join ',') + ']')
  }
  $json = '{"x":' + $x0 + ',"y":' + $y0 + ',"w":' + $ww + ',"h":' + $hh + ',"lum":[' + ($rows -join ',') + ']}'
  [System.IO.File]::WriteAllText($path, $json)
}

if ($jpeg) {
  $grid = Get-Content -Raw $in | ConvertFrom-Json
  $bmp = New-Object System.Drawing.Bitmap ([int]$grid.w), ([int]$grid.h), ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  for ($j = 0; $j -lt $grid.h; $j++) {
    $row = $grid.lum[$j]
    for ($i = 0; $i -lt $grid.w; $i++) {
      $v = [int][math]::Round([math]::Min(255, [math]::Max(0, [double]$row[$i])))
      $bmp.SetPixel($i, $j, [System.Drawing.Color]::FromArgb($v, $v, $v))
    }
  }
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$quality)
  $bmp.Save($out, $codec, $params)
  $bmp.Dispose()
  $back = New-Object System.Drawing.Bitmap $out
  Dump-Bitmap $back 0 0 $back.Width $back.Height $dump
  $back.Dispose()
  Write-Output 'ok'
  exit 0
}

if ($img -eq '' -or $w -le 0 -or $h -le 0 -or $out -eq '') { throw 'mark.ps1: -img -x -y -w -h -out are required' }
$src = New-Object System.Drawing.Bitmap $img
Dump-Bitmap $src $x $y $w $h $out
$src.Dispose()
Write-Output 'ok'
