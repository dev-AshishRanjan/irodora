# F-220 authoring helper — the corner radius of a filled rectangle in a mockup render. Not a gate.
#   corner <image> <x> <y> <w> <h> <bgHex> <threshold>
# For the top-left and top-right corners of the box, reads each of the first rows and reports how far
# in from the box edge the fill begins (the inset). For a circular corner of radius r, the inset at
# row k is r - sqrt(r^2 - (r-k)^2); the radius is fitted to those insets by least squares over r.
# The box must be the swatch itself (fill edges), not a label beneath it.
param([string]$img, [int]$x, [int]$y, [int]$w, [int]$h, [string]$bg = '1A1B20', [int]$t = 60)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;

public static class Corner {
  public static string Measure(string path, int x, int y, int w, int h, string bg, int t) {
    int W, H, S; byte[] p;
    using (var b = new Bitmap(path)) {
      W = b.Width; H = b.Height;
      var d = b.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
      S = d.Stride; p = new byte[S * H]; Marshal.Copy(d.Scan0, p, 0, p.Length); b.UnlockBits(d);
    }
    int cR = Convert.ToInt32(bg.Substring(0, 2), 16), cG = Convert.ToInt32(bg.Substring(2, 2), 16), cB = Convert.ToInt32(bg.Substring(4, 2), 16);
    Func<int, int, bool> ink = (i, j) => {
      int o = j * S + i * 3;
      return Math.Abs(p[o + 2] - cR) + Math.Abs(p[o + 1] - cG) + Math.Abs(p[o] - cB) > t;
    };
    int rows = Math.Min(h / 2, 40);
    var left = new int[rows]; var right = new int[rows];
    for (int k = 0; k < rows; k++) {
      int j = y + k; left[k] = -1; right[k] = -1;
      for (int i = x; i < x + w / 2; i++) if (ink(i, j)) { left[k] = i - x; break; }
      for (int i = x + w - 1; i >= x + w / 2; i--) if (ink(i, j)) { right[k] = (x + w - 1) - i; break; }
    }
    var sb = new StringBuilder();
    sb.Append("left insets:  "); foreach (var v in left) sb.Append(v).Append(' ');
    sb.Append("\nright insets: "); foreach (var v in right) sb.Append(v).Append(' ');
    sb.AppendFormat("\nfitted radius: left {0:F1} px, right {1:F1} px", Fit(left), Fit(right));
    return sb.ToString();
  }

  // The box is read a few px OUTSIDE the true edge, so: skip the rows above the edge (no ink), take the
  // straight-side inset the rows settle at as the baseline (the median of the last third), subtract it,
  // and fit a circle of radius r by least squares over 0.5..40 px on the rows that remain.
  static double Fit(int[] raw) {
    int first = 0; while (first < raw.Length && raw[first] < 0) first++;
    if (raw.Length - first < 6) return -1;
    var tail = new System.Collections.Generic.List<int>();
    for (int k = first + (raw.Length - first) * 2 / 3; k < raw.Length; k++) if (raw[k] >= 0) tail.Add(raw[k]);
    if (tail.Count == 0) return -1;
    tail.Sort(); int baseline = tail[tail.Count / 2];
    int n = raw.Length - first;
    var ins = new double[n];
    for (int k = 0; k < n; k++) ins[k] = Math.Max(0, (raw[first + k] < 0 ? 0 : raw[first + k]) - baseline);
    double best = 0, bestErr = double.MaxValue;
    for (double r = 0.5; r <= 40; r += 0.5) {
      double err = 0;
      for (int k = 0; k < n; k++) {
        double model = k >= r ? 0 : r - Math.Sqrt(r * r - (r - k) * (r - k));
        double e = model - ins[k]; err += e * e;
      }
      if (err < bestErr) { bestErr = err; best = r; }
    }
    return best;
  }
}
'@

[Corner]::Measure((Resolve-Path $img).Path, $x, $y, $w, $h, $bg, $t)
