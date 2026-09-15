# F-220 authoring helper — read-only measurement of a mockup render. Not a gate.
#   mean  <image> <x> <y> <w> <h>                          average colour of a box, as hex, plus its spread
#   edges <image> <x> <y> <w> <h> <bgHex> <threshold>      runs of rows and of columns that differ from the
#                                                          background by more than threshold (sum of |dRGB|)
#   blobs <image> <x> <y> <w> <h> <bgHex> <threshold> <gap> <minArea>
#                                                          bounding boxes of the connected regions that differ
#                                                          from the background, pixels within <gap> merged —
#                                                          one line per element, top to bottom, left to right
#   px    <image> <x> <y>                                  one pixel
param([string]$cmd, [string]$img, [int]$x = 0, [int]$y = 0, [int]$w = 1, [int]$h = 1, [string]$bg = '000000', [int]$t = 60, [int]$gap = 4, [int]$minArea = 16)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;

public static class Mk {
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

  static int[] Hex(string bg) {
    return new int[] { Convert.ToInt32(bg.Substring(0, 2), 16), Convert.ToInt32(bg.Substring(2, 2), 16), Convert.ToInt32(bg.Substring(4, 2), 16) };
  }

  public static string Mean(string path, int x, int y, int w, int h) {
    int W, H, S; var p = Load(path, out W, out H, out S);
    long r = 0, g = 0, bl = 0; int n = 0, lo = 765, hi = 0;
    for (int j = y; j < y + h && j < H; j++)
      for (int i = x; i < x + w && i < W; i++) {
        int o = j * S + i * 3; int B = p[o], G = p[o + 1], R = p[o + 2];
        r += R; g += G; bl += B; n++;
        int s = R + G + B; if (s < lo) lo = s; if (s > hi) hi = s;
      }
    if (n == 0) return "empty box";
    return String.Format("#{0:X2}{1:X2}{2:X2}  n={3}  spread={4}", (int)(r / n), (int)(g / n), (int)(bl / n), n, hi - lo);
  }

  public static string Edges(string path, int x, int y, int w, int h, string bg, int t) {
    int W, H, S; var p = Load(path, out W, out H, out S);
    var c = Hex(bg);
    int x1 = Math.Min(x + w, W), y1 = Math.Min(y + h, H);
    var rowHit = new bool[H]; var colHit = new bool[W];
    for (int j = y; j < y1; j++)
      for (int i = x; i < x1; i++) {
        int o = j * S + i * 3;
        int d = Math.Abs(p[o + 2] - c[0]) + Math.Abs(p[o + 1] - c[1]) + Math.Abs(p[o] - c[2]);
        if (d > t) { rowHit[j] = true; colHit[i] = true; }
      }
    var sb = new StringBuilder();
    sb.Append("rows: "); Runs(sb, rowHit, y, y1);
    sb.Append("\ncols: "); Runs(sb, colHit, x, x1);
    return sb.ToString();
  }

  static void Runs(StringBuilder sb, bool[] hit, int a, int b) {
    int start = -1;
    for (int k = a; k <= b; k++) {
      bool on = k < b && hit[k];
      if (on && start < 0) start = k;
      if (!on && start >= 0) { sb.AppendFormat("{0}-{1}({2}) ", start, k - 1, k - start); start = -1; }
    }
  }

  public static string Blobs(string path, int x, int y, int w, int h, string bg, int t, int gap, int minArea) {
    int W, H, S; var p = Load(path, out W, out H, out S);
    var c = Hex(bg);
    int x1 = Math.Min(x + w, W), y1 = Math.Min(y + h, H);
    int RW = x1 - x, RH = y1 - y;
    if (RW <= 0 || RH <= 0) return "empty region";
    var m = new bool[RW * RH];
    for (int j = 0; j < RH; j++)
      for (int i = 0; i < RW; i++) {
        int o = (y + j) * S + (x + i) * 3;
        int d = Math.Abs(p[o + 2] - c[0]) + Math.Abs(p[o + 1] - c[1]) + Math.Abs(p[o] - c[2]);
        m[j * RW + i] = d > t;
      }
    // Dilate by gap, separably (a row pass then a column pass), so near pixels join one element.
    var dh = new bool[RW * RH];
    for (int j = 0; j < RH; j++) {
      int last = int.MinValue / 2;
      for (int i = 0; i < RW; i++) if (m[j * RW + i]) last = i; else if (i - last <= gap) { } // forward
      int prev = int.MinValue / 2;
      var fw = new int[RW];
      for (int i = 0; i < RW; i++) { if (m[j * RW + i]) prev = i; fw[i] = prev; }
      int next = int.MaxValue / 2;
      for (int i = RW - 1; i >= 0; i--) {
        if (m[j * RW + i]) next = i;
        dh[j * RW + i] = (i - fw[i] <= gap) || (next - i <= gap);
      }
    }
    var dv = new bool[RW * RH];
    for (int i = 0; i < RW; i++) {
      var fw = new int[RH];
      int prev = int.MinValue / 2;
      for (int j = 0; j < RH; j++) { if (dh[j * RW + i]) prev = j; fw[j] = prev; }
      int next = int.MaxValue / 2;
      for (int j = RH - 1; j >= 0; j--) {
        if (dh[j * RW + i]) next = j;
        dv[j * RW + i] = (j - fw[j] <= gap) || (next - j <= gap);
      }
    }
    // Label the dilated mask; measure each label on the ORIGINAL pixels only.
    var label = new int[RW * RH];
    var boxes = new List<int[]>();
    var stack = new Stack<int>();
    int next_ = 0;
    for (int s = 0; s < RW * RH; s++) {
      if (!dv[s] || label[s] != 0) continue;
      next_++;
      int bx0 = int.MaxValue, by0 = int.MaxValue, bx1 = -1, by1 = -1, n = 0;
      label[s] = next_; stack.Push(s);
      while (stack.Count > 0) {
        int q = stack.Pop(); int qi = q % RW, qj = q / RW;
        if (m[q]) { n++; if (qi < bx0) bx0 = qi; if (qi > bx1) bx1 = qi; if (qj < by0) by0 = qj; if (qj > by1) by1 = qj; }
        if (qi > 0 && dv[q - 1] && label[q - 1] == 0) { label[q - 1] = next_; stack.Push(q - 1); }
        if (qi < RW - 1 && dv[q + 1] && label[q + 1] == 0) { label[q + 1] = next_; stack.Push(q + 1); }
        if (qj > 0 && dv[q - RW] && label[q - RW] == 0) { label[q - RW] = next_; stack.Push(q - RW); }
        if (qj < RH - 1 && dv[q + RW] && label[q + RW] == 0) { label[q + RW] = next_; stack.Push(q + RW); }
      }
      if (n == 0) continue;
      int bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
      if (bw * bh < minArea) continue;
      boxes.Add(new int[] { bx0 + x, by0 + y, bw, bh, n });
    }
    boxes.Sort((a, b) => a[1] != b[1] ? a[1].CompareTo(b[1]) : a[0].CompareTo(b[0]));
    var sb = new StringBuilder();
    sb.AppendFormat("{0} element(s)\n", boxes.Count);
    foreach (var b in boxes) sb.AppendFormat("  x={0} y={1} w={2} h={3}  ink={4}\n", b[0], b[1], b[2], b[3], b[4]);
    return sb.ToString();
  }

  public static string Px(string path, int x, int y) {
    int W, H, S; var p = Load(path, out W, out H, out S);
    int o = y * S + x * 3;
    return String.Format("#{0:X2}{1:X2}{2:X2}", p[o + 2], p[o + 1], p[o]);
  }
}
'@

$full = (Resolve-Path $img).Path
switch ($cmd) {
  'mean'  { [Mk]::Mean($full, $x, $y, $w, $h) }
  'edges' { [Mk]::Edges($full, $x, $y, $w, $h, $bg, $t) }
  'blobs' { [Mk]::Blobs($full, $x, $y, $w, $h, $bg, $t, $gap, $minArea) }
  'px'    { [Mk]::Px($full, $x, $y) }
  default { 'usage: mean|edges|blobs|px <image> ...' }
}
