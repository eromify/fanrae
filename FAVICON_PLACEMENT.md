# Where to Put Your Logo & Favicon Files

## Quick Answer

Put all your logo/favicon files directly in the **`app/`** folder:

```
app/
  ├── favicon.ico          ← Put your favicon here
  ├── icon.png             ← Or use this name (32x32 pixels)
  ├── apple-icon.png       ← Apple touch icon (180x180 pixels) - optional
  └── opengraph-image.png  ← Social sharing image (1200x630 pixels) - optional
```

## Step-by-Step

1. **Copy your favicon file** to the `app/` directory
2. **Name it one of these:**
   - `favicon.ico` (most common)
   - `icon.png` or `icon.ico`
   - Next.js will automatically use it!

3. **That's it!** Next.js will automatically:
   - Serve it at `/favicon.ico`
   - Add it to your HTML metadata
   - Use it in browser tabs

## File Naming (Next.js Auto-Detection)

Next.js 14 automatically detects these filenames when placed in `app/`:

| Filename | Purpose | Size |
|----------|---------|------|
| `favicon.ico` | Browser favicon | 32x32 pixels |
| `icon.png` or `icon.ico` | Browser icon | 32x32 pixels |
| `apple-icon.png` | Apple touch icon | 180x180 pixels |
| `opengraph-image.png` | Social media preview | 1200x630 pixels |

## What Files Do You Have?

Tell me the names of your files and I can help you place them correctly!


