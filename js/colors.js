/**
 * colors.js — Color science engine for رنگ‌یاب (Color Finder)
 * ------------------------------------------------------------
 * Responsible for:
 *   1) A curated bilingual (Persian/English) color-name dataset:
 *      A curated set of hand-named base hues, each expanded into
 *      lightness/saturation variants for stronger real-world matching.
 *   2) sRGB -> CIE Lab conversion (D65 illuminant).
 *   3) CIEDE2000 — the color-difference formula (Sharma, Wu & Dalal,
 *      2005) used across the paint/textile/print industries because
 *      it tracks *human-perceived* difference far better than plain
 *      Euclidean RGB distance or the older CIE76/94 formulas.
 *
 * Exposes a single global: window.ColorEngine
 *   ColorEngine.findNearest(r, g, b) -> { match: {en, fa, hex}, deltaE }
 *   ColorEngine.rgbToHex(r, g, b)    -> "#RRGGBB"
 *   ColorEngine.COLOR_LIST           -> full generated list (for debugging)
 */
(function (global) {
  "use strict";

  /* ---------------------------------------------------------
     1) Bilingual dataset
  --------------------------------------------------------- */
  const BASE_COLORS = [
    { en: "Red", fa: "قرمز", hex: "#FF0000" },
    { en: "Scarlet", fa: "قرمز آتشین", hex: "#FF2400" },
    { en: "Crimson", fa: "زرشکی", hex: "#DC143C" },
    { en: "Ruby", fa: "یاقوتی", hex: "#E0115F" },
    { en: "Garnet", fa: "لعل", hex: "#9A2A2A" },
    { en: "Maroon", fa: "شرابی", hex: "#800000" },
    { en: "Burgundy", fa: "بورگاندی", hex: "#800020" },
    { en: "Wine", fa: "رنگ شراب", hex: "#722F37" },
    { en: "Rose", fa: "رز", hex: "#FF007F" },
    { en: "Dusty Rose", fa: "صورتی چرک", hex: "#C08081" },
    { en: "Pink", fa: "صورتی", hex: "#FFC0CB" },
    { en: "Blush", fa: "صورتی ملایم", hex: "#DE5D83" },
    { en: "Baby Pink", fa: "صورتی نوزادی", hex: "#F4C2C2" },
    { en: "Hot Pink", fa: "صورتی پرشور", hex: "#FF69B4" },
    { en: "Fuchsia", fa: "فوشیا", hex: "#FF00AF" },
    { en: "Magenta", fa: "سرخابی", hex: "#FF00FF" },
    { en: "Plum", fa: "آلویی", hex: "#8E4585" },
    { en: "Mauve", fa: "یاسی خاکستری", hex: "#E0B0FF" },
    { en: "Lilac", fa: "یاسی", hex: "#C8A2C8" },
    { en: "Purple", fa: "بنفش", hex: "#800080" },
    { en: "Violet", fa: "ارغوانی", hex: "#8F00FF" },
    { en: "Lavender", fa: "بنفش کم‌رنگ", hex: "#E6E6FA" },
    { en: "Orchid", fa: "ارکیده‌ای", hex: "#DA70D6" },
    { en: "Amethyst", fa: "آمتیست", hex: "#9966CC" },
    { en: "Eggplant", fa: "بادمجانی", hex: "#614051" },
    { en: "Indigo", fa: "نیلی", hex: "#4B0082" },
    { en: "Blue", fa: "آبی", hex: "#0000FF" },
    { en: "Royal Blue", fa: "آبی سلطنتی", hex: "#4169E1" },
    { en: "Azure", fa: "لاجوردی", hex: "#007FFF" },
    { en: "Cerulean", fa: "آبی سیرولین", hex: "#007BA7" },
    { en: "Sky Blue", fa: "آبی آسمانی", hex: "#87CEEB" },
    { en: "Baby Blue", fa: "آبی نوزادی", hex: "#89CFF0" },
    { en: "Powder Blue", fa: "آبی پودری", hex: "#B0E0E6" },
    { en: "Navy", fa: "سرمه‌ای", hex: "#000080" },
    { en: "Midnight Blue", fa: "آبی نیمه‌شب", hex: "#191970" },
    { en: "Cobalt Blue", fa: "آبی کبالت", hex: "#0047AB" },
    { en: "Sapphire", fa: "یاقوت کبود", hex: "#0F52BA" },
    { en: "Prussian Blue", fa: "آبی پروسی", hex: "#003153" },
    { en: "Steel Blue", fa: "آبی فولادی", hex: "#4682B4" },
    { en: "Denim", fa: "جین", hex: "#1560BD" },
    { en: "Turquoise", fa: "فیروزه‌ای", hex: "#40E0D0" },
    { en: "Aqua", fa: "آکوا", hex: "#00B8D4" },
    { en: "Cyan", fa: "آبی فیروزه‌ای", hex: "#00FFFF" },
    { en: "Teal", fa: "سبزآبی", hex: "#008080" },
    { en: "Duck Green", fa: "سبز کله‌غازی", hex: "#006A5B" },
    { en: "Petrol", fa: "نفتی", hex: "#1B4D4D" },
    { en: "Jade", fa: "یشمی", hex: "#00A86B" },
    { en: "Jade Green", fa: "سبز یشمی", hex: "#2BAE66" },
    { en: "Mint", fa: "نعنایی", hex: "#98FF98" },
    { en: "Seafoam", fa: "سبز کف دریایی", hex: "#93E9BE" },
    { en: "Green", fa: "سبز", hex: "#008000" },
    { en: "Emerald", fa: "زمردی", hex: "#50C878" },
    { en: "Forest Green", fa: "سبز جنگلی", hex: "#228B22" },
    { en: "Pine Green", fa: "سبز کاجی", hex: "#01796F" },
    { en: "Moss Green", fa: "سبز خزه‌ای", hex: "#8A9A5B" },
    { en: "Sage", fa: "سبز مریم‌گلی", hex: "#9CAF88" },
    { en: "Sage Green", fa: "سبز سیج", hex: "#87A96B" },
    { en: "Lime Green", fa: "سبز چمنی", hex: "#32CD32" },
    { en: "Chartreuse", fa: "سبز مایل به زرد", hex: "#7FFF00" },
    { en: "Olive", fa: "زیتونی", hex: "#808000" },
    { en: "Avocado", fa: "آووکادویی", hex: "#568203" },
    { en: "Celadon", fa: "سلادون", hex: "#ACE1AF" },
    { en: "Pistachio Green", fa: "سبز پسته‌ای", hex: "#93C572" },
    { en: "Khaki", fa: "خاکی", hex: "#C3B091" },
    { en: "Yellow", fa: "زرد", hex: "#FFFF00" },
    { en: "Lemon", fa: "لیمویی", hex: "#FFF44F" },
    { en: "Amber", fa: "کهربایی", hex: "#FFBF00" },
    { en: "Mustard", fa: "خردلی", hex: "#FFDB58" },
    { en: "Butter Yellow", fa: "زرد کره‌ای", hex: "#F5E8AA" },
    { en: "Canary", fa: "زرد قناری", hex: "#FFFF99" },
    { en: "Maize", fa: "ذرتی", hex: "#FBEC5D" },
    { en: "Saffron", fa: "زعفرانی", hex: "#F4C430" },
    { en: "Orange", fa: "نارنجی", hex: "#FFA500" },
    { en: "Tangerine", fa: "نارنگی", hex: "#F28500" },
    { en: "Apricot", fa: "زردآلویی", hex: "#FBCEB1" },
    { en: "Coral", fa: "مرجانی", hex: "#FF7F50" },
    { en: "Salmon", fa: "صورتی‌نارنجی", hex: "#FA8072" },
    { en: "Peach", fa: "هلویی", hex: "#FFE5B4" },
    { en: "Terracotta", fa: "سفالی", hex: "#E2725B" },
    { en: "Rust", fa: "زنگاری", hex: "#B7410E" },
    { en: "Burnt Orange", fa: "نارنجی سوخته", hex: "#CC5500" },
    { en: "Brown", fa: "قهوه‌ای", hex: "#8B4513" },
    { en: "Chocolate", fa: "شکلاتی", hex: "#7B3F00" },
    { en: "Chestnut", fa: "شاه‌بلوطی", hex: "#954535" },
    { en: "Coffee", fa: "قهوه‌ای قهوه", hex: "#6F4E37" },
    { en: "Walnut", fa: "گردویی", hex: "#5C4033" },
    { en: "Cinnamon", fa: "دارچینی", hex: "#D2691E" },
    { en: "Caramel", fa: "کاراملی", hex: "#C68E17" },
    { en: "Honey", fa: "عسلی", hex: "#D49A2A" },
    { en: "Camel", fa: "شتری", hex: "#C19A6B" },
    { en: "Beige", fa: "بژ", hex: "#F5F5DC" },
    { en: "Tan", fa: "قهوه‌ای روشن", hex: "#D2B48C" },
    { en: "Sand", fa: "شنی", hex: "#C2B280" },
    { en: "Ecru", fa: "اکرو", hex: "#CDB891" },
    { en: "Taupe", fa: "تاپ", hex: "#483C32" },
    { en: "Greige", fa: "گریژ", hex: "#B0A999" },
    { en: "Ivory", fa: "عاجی", hex: "#FFFFF0" },
    { en: "Cream", fa: "کرم", hex: "#FFFDD0" },
    { en: "Vanilla", fa: "وانیلی", hex: "#F3E5AB" },
    { en: "Champagne", fa: "شامپاینی", hex: "#F7E7CE" },
    { en: "Pearl", fa: "مرواریدی", hex: "#EAE0C8" },
    { en: "Alabaster", fa: "مرمر سفید", hex: "#EDEAE0" },
    { en: "Charcoal", fa: "زغالی", hex: "#36454F" },
    { en: "Gray", fa: "خاکستری", hex: "#808080" },
    { en: "Slate Gray", fa: "خاکستری سنگی", hex: "#708090" },
    { en: "Ash Gray", fa: "خاکستری دودی", hex: "#B2BEB5" },
    { en: "Smoke", fa: "دودی", hex: "#738276" },
    { en: "Graphite", fa: "گرافیتی", hex: "#383838" },
  ];

  const FIXED_COLORS = [
    { en: "White", fa: "سفید", hex: "#FFFFFF" },
    { en: "Black", fa: "سیاه", hex: "#000000" },
    { en: "Silver", fa: "نقره‌ای", hex: "#C0C0C0" },
    { en: "Gold", fa: "طلایی", hex: "#FFD700" },
    { en: "Rose Gold", fa: "رزگلد", hex: "#B76E79" },
    { en: "Bronze", fa: "برنزی", hex: "#CD7F32" },
    { en: "Copper", fa: "مسی", hex: "#B87333" },
    { en: "Platinum", fa: "پلاتینی", hex: "#E5E4E2" },
  ];

  const VARIANTS = [
    { enPre: "", faSuf: "", dS: 0, dL: 0 },
    { enPre: "Light ", faSuf: " روشن", dS: -8, dL: 18 },
    { enPre: "Very Light ", faSuf: " بسیار روشن", dS: -18, dL: 32 },
    { enPre: "Dark ", faSuf: " تیره", dS: 6, dL: -18 },
    { enPre: "Very Dark ", faSuf: " بسیار تیره", dS: 10, dL: -32 },
  ];

  const MORE_VARIANTS = [
    { enPre: "Pale ", faSuf: " کمرنگ", dS: -12, dL: 12 },
    { enPre: "Deep ", faSuf: " عمیق", dS: 8, dL: -8 },
    { enPre: "Muted ", faSuf: " ملایم", dS: -10, dL: 0 },
    { enPre: "Vivid ", faSuf: " زنده", dS: 15, dL: 0 },
    { enPre: "Pastel ", faSuf: " پاستلی", dS: -15, dL: 15 },
  ];

  const ALL_VARIANTS = [...VARIANTS, ...MORE_VARIANTS];

  /* ---------------------------------------------------------
     2) Color-space helpers
  --------------------------------------------------------- */
  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ];
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h;
    let s;
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) {
      h = 0;
      s = 0;
    } else {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function variantHex(hex, dS, dL) {
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    const [r2, g2, b2] = hslToRgb(h, clamp(s + dS, 0, 100), clamp(l + dL, 3, 97));
    return rgbToHex(r2, g2, b2);
  }

  // sRGB (D65) -> CIE Lab
  function srgbToLinear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function rgbToLab(r, g, b) {
    const R = srgbToLinear(r);
    const G = srgbToLinear(g);
    const B = srgbToLinear(b);
    const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) * 100;
    const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.072175) * 100;
    const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) * 100;
    const Xn = 95.0489;
    const Yn = 100.0;
    const Zn = 108.884;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(X / Xn);
    const fy = f(Y / Yn);
    const fz = f(Z / Zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  /* ---------------------------------------------------------
     3) CIEDE2000 (Sharma, Wu & Dalal, 2005)
     Verified against the paper's published reference test table.
  --------------------------------------------------------- */
  function deg2rad(d) {
    return (d * Math.PI) / 180;
  }
  function rad2deg(r) {
    return (r * 180) / Math.PI;
  }

  function deltaE00(lab1, lab2) {
    const [L1, a1, b1] = lab1;
    const [L2, a2, b2] = lab2;

    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const Cbar = (C1 + C2) / 2;

    const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));

    const a1p = a1 * (1 + G);
    const a2p = a2 * (1 + G);

    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);

    let h1p = Math.atan2(b1, a1p);
    if (h1p < 0) h1p += 2 * Math.PI;
    h1p = rad2deg(h1p);

    let h2p = Math.atan2(b2, a2p);
    if (h2p < 0) h2p += 2 * Math.PI;
    h2p = rad2deg(h2p);

    const dLp = L2 - L1;
    const dCp = C2p - C1p;

    let dhp;
    if (C1p * C2p === 0) {
      dhp = 0;
    } else {
      dhp = h2p - h1p;
      if (dhp > 180) dhp -= 360;
      else if (dhp < -180) dhp += 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp) / 2);

    const Lbarp = (L1 + L2) / 2;
    const Cbarp = (C1p + C2p) / 2;

    let hbarp;
    if (C1p * C2p === 0) {
      hbarp = h1p + h2p;
    } else if (Math.abs(h1p - h2p) <= 180) {
      hbarp = (h1p + h2p) / 2;
    } else {
      hbarp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
    }

    const T =
      1 -
      0.17 * Math.cos(deg2rad(hbarp - 30)) +
      0.24 * Math.cos(deg2rad(2 * hbarp)) +
      0.32 * Math.cos(deg2rad(3 * hbarp + 6)) -
      0.2 * Math.cos(deg2rad(4 * hbarp - 63));

    const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
    const RC = 2 * Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)));
    const SL = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
    const SC = 1 + 0.045 * Cbarp;
    const SH = 1 + 0.015 * Cbarp * T;
    const RT = -Math.sin(deg2rad(2 * dTheta)) * RC;

    return Math.sqrt(
      Math.pow(dLp / SL, 2) +
        Math.pow(dCp / SC, 2) +
        Math.pow(dHp / SH, 2) +
        RT * (dCp / SC) * (dHp / SH)
    );
  }

  /* ---------------------------------------------------------
     4) Build the full color list with Lab
        pre-computed once, then expose the matcher.
  --------------------------------------------------------- */
  function buildColorList() {
    const list = [];
    for (const c of BASE_COLORS) {
      for (const v of ALL_VARIANTS) {
        const hex = v.enPre === "" ? c.hex : variantHex(c.hex, v.dS, v.dL);
        const entry = { en: v.enPre + c.en, fa: c.fa + v.faSuf, hex };
        entry.lab = rgbToLab(...hexToRgb(hex));
        list.push(entry);
      }
    }
    for (const c of FIXED_COLORS) {
      const entry = { en: c.en, fa: c.fa, hex: c.hex };
      entry.lab = rgbToLab(...hexToRgb(c.hex));
      list.push(entry);
    }
    return list;
  }

  const COLOR_LIST = buildColorList();

  function findNearest(r, g, b) {
    const lab = rgbToLab(r, g, b);
    let best = null;
    let bestD = Infinity;
    for (const entry of COLOR_LIST) {
      const d = deltaE00(lab, entry.lab);
      if (d < bestD) {
        bestD = d;
        best = entry;
      }
    }
    return { match: best, deltaE: bestD };
  }

  global.ColorEngine = {
    findNearest,
    rgbToHex,
    rgbToLab,
    deltaE00,
    COLOR_LIST,
  };
})(window);
