# F-229 authoring helper - measures the line art inside a mockup box. Not a gate. ASCII only, so
# Windows PowerShell 5.1 reads it correctly without a BOM (see the F-275 lesson).
#
#   art-measure.ps1 -jobs <jobs.json> -out <out.json>
#
# jobs: [ { "id": "01.header.line-art", "img": "E:\\JCFIP\\mockups\\01_home_screen.jpg",
#           "x": 471, "y": 15, "w": 297, "h": 261 } ]
#
# For each job it reports, over the box:
#   ground     the median colour - what the art sits on - and its luma
#   inkP50     the luma at the median of the art pixels: the line as it is mostly drawn
#   inkP90     the luma a tenth of the art pixels reach, away from the ground: the line at full
#              strength. Read both - a box that catches a neighbouring label shows it as a gap
#              between them
#   strokePx   the median BOUNDED run of art pixels, the SHORTER way across: a wave measures its
#              length across and its width down, so the smaller of the two medians is the line
#   coverage   the share of pixels that are art at all
#   n          how many art pixels were found - a measurement over too few is not a measurement
#
# "Art" is a pixel whose luma differs from the ground by more than half the distance to the
# strongest pixel in the box (a fixed fraction of the box's own range, so a faint drawing on a
# light ground and a bright one on a dark ground are read the same way).
param([Parameter(Mandatory = $true)][string]$jobs, [Parameter(Mandatory = $true)][string]$out)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $jobs)) { Write-Error "jobs file not found: $jobs"; exit 2 }

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class Art {
  static byte[] Load(string path, out int W, out int H, out int S) {
    using (var b = new Bitmap(path)) {
      W = b.Width; H = b.Height;
      var d = b.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
      S = d.Stride;
      var buf = new byte[S * H];
      Marshal.Copy(d.Scan0, buf, 0, buf.Length);
      b.UnlockBits(d);
      return buf;
    }
  }

  static double Luma(double r, double g, double b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

  static double Median(List<double> v) {
    if (v.Count == 0) return 0;
    v.Sort();
    return v[v.Count / 2];
  }

  // ground, groundL, inkP50, inkP90, strokePx, coverage, n - one line, comma separated.
  public static string Measure(string path, int x, int y, int w, int h) {
    int W, H, S; var p = Load(path, out W, out H, out S);
    int x1 = Math.Min(x + w, W), y1 = Math.Min(y + h, H);
    x = Math.Max(0, x); y = Math.Max(0, y);
    var rs = new List<double>(); var gs = new List<double>(); var bs = new List<double>();
    for (int j = y; j < y1; j++)
      for (int i = x; i < x1; i++) {
        int o = j * S + i * 3;
        rs.Add(p[o + 2]); gs.Add(p[o + 1]); bs.Add(p[o]);
      }
    if (rs.Count == 0) return "000000,0,0,0,0,0,0";
    double gr = Median(new List<double>(rs)), gg = Median(new List<double>(gs)), gb = Median(new List<double>(bs));
    double groundL = Luma(gr, gg, gb);

    double peak = 0;
    for (int j = y; j < y1; j++)
      for (int i = x; i < x1; i++) {
        int o = j * S + i * 3;
        double d = Math.Abs(Luma(p[o + 2], p[o + 1], p[o]) - groundL);
        if (d > peak) peak = d;
      }
    double cut = peak * 0.5;

    // The art pixels, their luma kept so the line can be read at a percentile rather than at its
    // brightest point - a box that catches a neighbouring label would otherwise report the label.
    var artL = new List<double>();
    int artN = 0;
    var across = new List<double>();
    var down = new List<double>();
    for (int j = y; j < y1; j++) {
      int run = 0; bool cutAtStart = false;
      for (int i = x; i < x1; i++) {
        int o = j * S + i * 3;
        double L = Luma(p[o + 2], p[o + 1], p[o]);
        bool art = Math.Abs(L - groundL) > cut;
        if (art) {
          artN++; artL.Add(L);
          if (i == x) cutAtStart = true;
          run++;
        } else {
          if (run > 0 && !cutAtStart) across.Add(run);
          run = 0; cutAtStart = false;
        }
      }
    }
    for (int i = x; i < x1; i++) {
      int run = 0; bool cutAtStart = false;
      for (int j = y; j < y1; j++) {
        int o = j * S + i * 3;
        bool art = Math.Abs(Luma(p[o + 2], p[o + 1], p[o]) - groundL) > cut;
        if (art) {
          if (j == y) cutAtStart = true;
          run++;
        } else {
          if (run > 0 && !cutAtStart) down.Add(run);
          run = 0; cutAtStart = false;
        }
      }
    }
    // A line's WIDTH is the shorter way across it: a horizontal wave measures its length across and
    // its width down, and the first draft reported a 197 px "stroke" for one.
    double ma = Median(across), md = Median(down);
    double stroke = ma == 0 ? md : (md == 0 ? ma : Math.Min(ma, md));

    // The ink at the median of the art pixels, and at their 90th percentile from the ground.
    artL.Sort();
    double p50 = artL.Count > 0 ? artL[artL.Count / 2] : groundL;
    double p90 = artL.Count > 0
      ? (p50 >= groundL ? artL[(int)(artL.Count * 0.9)] : artL[(int)(artL.Count * 0.1)])
      : groundL;
    string ground = string.Format("{0:x2}{1:x2}{2:x2}", (int)Math.Round(gr), (int)Math.Round(gg), (int)Math.Round(gb));
    double coverage = (double)artN / rs.Count;
    return string.Format("{0},{1:0.##},{2:0.##},{3:0.##},{4:0.###},{5:0.####},{6}",
      ground, groundL, p50, p90, stroke, coverage, artN);
  }
}
'@

$list = Get-Content -Raw $jobs | ConvertFrom-Json
$results = @()
foreach ($j in $list) {
  if (-not (Test-Path $j.img)) { Write-Error "image not found: $($j.img)"; exit 2 }
  $line = [Art]::Measure($j.img, [int]$j.x, [int]$j.y, [int]$j.w, [int]$j.h)
  $f = $line -split ','
  $results += [pscustomobject]@{
    id       = $j.id
    ground   = '#' + $f[0]
    groundL  = [double]$f[1]
    inkP50   = [double]$f[2]
    inkP90   = [double]$f[3]
    strokePx = [double]$f[4]
    coverage = [double]$f[5]
    n        = [int]$f[6]
  }
}
# WITHOUT A BOM. Set-Content -Encoding UTF8 writes one in Windows PowerShell 5.1, and JSON.parse
# refuses a file that starts with it.
$json = $results | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($out, $json, (New-Object System.Text.UTF8Encoding $false))
"measured $($results.Count) box(es) -> $out"
