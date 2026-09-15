# F-220 authoring helper — bounding boxes of the elements drawn OVER A PHOTOGRAPH, where a
# difference-from-background mask fails (the photo differs from its own mean everywhere).
# Pixels are selected by absolute brightness instead, then labelled exactly as `measure.ps1 blobs`.
#   mask <image> <x> <y> <w> <h> <bright|dark> <sumThreshold> <gap> <minArea>
#     bright: R+G+B >= threshold  (white strokes, light text, a white button)
#     dark:   R+G+B <= threshold  (a dark pill or card laid over the photo)
param([string]$img, [int]$x, [int]$y, [int]$w, [int]$h, [string]$mode = 'bright', [int]$t = 600, [int]$gap = 3, [int]$minArea = 40)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;

public static class Mask {
  public static string Run(string path, int x, int y, int w, int h, bool bright, int t, int gap, int minArea) {
    int W, H, S; byte[] p;
    using (var b = new Bitmap(path)) {
      W = b.Width; H = b.Height;
      var d = b.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
      S = d.Stride; p = new byte[S * H]; Marshal.Copy(d.Scan0, p, 0, p.Length); b.UnlockBits(d);
    }
    int x1 = Math.Min(x + w, W), y1 = Math.Min(y + h, H), RW = x1 - x, RH = y1 - y;
    if (RW <= 0 || RH <= 0) return "empty region";
    var m = new bool[RW * RH];
    for (int j = 0; j < RH; j++)
      for (int i = 0; i < RW; i++) {
        int o = (y + j) * S + (x + i) * 3;
        int s = p[o] + p[o + 1] + p[o + 2];
        m[j * RW + i] = bright ? s >= t : s <= t;
      }
    // Dilate by gap, separably, so the strokes of one element join.
    var dh = new bool[RW * RH];
    for (int j = 0; j < RH; j++) {
      var fw = new int[RW]; int prev = int.MinValue / 2;
      for (int i = 0; i < RW; i++) { if (m[j * RW + i]) prev = i; fw[i] = prev; }
      int next = int.MaxValue / 2;
      for (int i = RW - 1; i >= 0; i--) { if (m[j * RW + i]) next = i; dh[j * RW + i] = (i - fw[i] <= gap) || (next - i <= gap); }
    }
    var dv = new bool[RW * RH];
    for (int i = 0; i < RW; i++) {
      var fw = new int[RH]; int prev = int.MinValue / 2;
      for (int j = 0; j < RH; j++) { if (dh[j * RW + i]) prev = j; fw[j] = prev; }
      int next = int.MaxValue / 2;
      for (int j = RH - 1; j >= 0; j--) { if (dh[j * RW + i]) next = j; dv[j * RW + i] = (j - fw[j] <= gap) || (next - j <= gap); }
    }
    var label = new int[RW * RH]; var boxes = new List<int[]>(); var stack = new Stack<int>(); int n_ = 0;
    for (int s0 = 0; s0 < RW * RH; s0++) {
      if (!dv[s0] || label[s0] != 0) continue;
      n_++; int bx0 = int.MaxValue, by0 = int.MaxValue, bx1 = -1, by1 = -1, n = 0;
      label[s0] = n_; stack.Push(s0);
      while (stack.Count > 0) {
        int q = stack.Pop(); int qi = q % RW, qj = q / RW;
        if (m[q]) { n++; if (qi < bx0) bx0 = qi; if (qi > bx1) bx1 = qi; if (qj < by0) by0 = qj; if (qj > by1) by1 = qj; }
        if (qi > 0 && dv[q - 1] && label[q - 1] == 0) { label[q - 1] = n_; stack.Push(q - 1); }
        if (qi < RW - 1 && dv[q + 1] && label[q + 1] == 0) { label[q + 1] = n_; stack.Push(q + 1); }
        if (qj > 0 && dv[q - RW] && label[q - RW] == 0) { label[q - RW] = n_; stack.Push(q - RW); }
        if (qj < RH - 1 && dv[q + RW] && label[q + RW] == 0) { label[q + RW] = n_; stack.Push(q + RW); }
      }
      if (n == 0) continue;
      int bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
      if (bw * bh < minArea) continue;
      boxes.Add(new int[] { bx0 + x, by0 + y, bw, bh, n });
    }
    boxes.Sort((a, b) => a[1] != b[1] ? a[1].CompareTo(b[1]) : a[0].CompareTo(b[0]));
    var sb = new StringBuilder(); sb.AppendFormat("{0} element(s)\n", boxes.Count);
    foreach (var b in boxes) sb.AppendFormat("  x={0} y={1} w={2} h={3}  ink={4}\n", b[0], b[1], b[2], b[3], b[4]);
    return sb.ToString();
  }
}
'@

[Mask]::Run((Resolve-Path $img).Path, $x, $y, $w, $h, $mode -eq 'bright', $t, $gap, $minArea)
