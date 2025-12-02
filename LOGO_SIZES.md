# Logo & Icon Size Reference Guide

## Quick Answer

**Metadata/Favicon Logo:** **32x32 pixels** (not inches!)

## Recommended Logo Sizes for Web

### Favicon (Browser Tab Icon)
- **32x32 pixels** - Standard favicon ✅
- **16x16 pixels** - Small browser favicon
- **48x48 pixels** - High-res favicon
- **Format:** PNG, ICO, or SVG

### Modern Web Icons (Next.js 14)
- **192x192 pixels** - Android/Chrome home screen
- **512x512 pixels** - PWA icon
- **180x180 pixels** - Apple touch icon
- **Format:** PNG with transparent background

### Social Media / Open Graph
- **1200x630 pixels** - Open Graph image (Facebook, Twitter, etc.)
- **Format:** PNG or JPG

## For Next.js App

### Option 1: Single Favicon (Simplest)
1. Create a **32x32 pixel** PNG or ICO file
2. Name it `favicon.ico` or `icon.png`
3. Place it in the `app/` directory
4. Next.js will automatically use it

### Option 2: Multiple Sizes (Recommended)
1. Create icons in these sizes:
   - `icon.png` - **32x32 pixels**
   - `apple-icon.png` - **180x180 pixels**
   - `icon-192.png` - **192x192 pixels**
   - `icon-512.png` - **512x512 pixels**
2. Place all in the `app/` directory
3. Next.js will automatically serve the right size

### Option 3: Add to Metadata
You can also specify in `app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  title: 'Fanrae - Creator Platform',
  description: 'Monetize your content with Fanrae',
  icons: {
    icon: '/icon.png', // 32x32 pixels
    apple: '/apple-icon.png', // 180x180 pixels
  },
  openGraph: {
    images: ['/og-image.png'], // 1200x630 pixels
  },
}
```

## File Locations

```
app/
  ├── icon.png (32x32 pixels) ✅
  ├── favicon.ico (32x32 pixels) ✅
  ├── apple-icon.png (180x180 pixels)
  └── og-image.png (1200x630 pixels)
```

## Design Tips

- Use **transparent background** (PNG)
- Keep it simple - icons are small!
- Test at actual size to ensure readability
- Use high contrast colors
- Avoid thin lines (they disappear at small sizes)

## Quick Checklist

- [ ] **32x32 pixel** favicon created ✅
- [ ] Format: PNG or ICO
- [ ] Transparent background
- [ ] Placed in `app/` directory
- [ ] Tested in browser tab

---

**TL;DR:** Your metadata logo should be **32x32 pixels** (PNG or ICO format) and placed in the `app/` directory.

