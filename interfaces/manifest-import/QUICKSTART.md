# Manifest Import - Quick Start Guide

## 5-Minute Overview

The manifest import feature allows you to create TPEN projects from IIIF manifests using a simple URL.

## Basic Usage

### Create a Link
```html
<a href="/import-manifest?manifest=ENCODED_URL">
  Import Manifest
</a>
```

### URL Examples

**Single Manifest:**
```
/import-manifest?manifest=http%3A%2F%2Fwww.e-codices.unifr.ch%2Fmetadata%2Fiiif%2Fsl-0002%2Fmanifest.json
```

**Multiple Manifests:**
```
/import-manifest?manifest=URL1&manifest=URL2&manifest=URL3
```

## How Users Experience It

1. **Click link** with manifest URL(s)
2. **Sign in** (if not already authenticated)
3. **Wait** for projects to be created (loader shown)
4. **See results** with newly created projects
5. **Click buttons** to transcribe or manage

## What Users See at Each Step

### Step 1: Login (if needed)
Simple card with "Sign In to TPEN" button

### Step 2: Creating
Spinner animation with "Creating Projects" message

### Step 3: Results
- Green checkmarks for successful projects
- Red X for any failed imports
- Project cards with:
  - Project name
  - View button
  - Transcribe button
- Links to go back to TPEN or view all projects

## For Developers

### Embed in JavaScript
```javascript
function importManifests(manifestUrls) {
  const params = new URLSearchParams();
  manifestUrls.forEach(url => params.append('manifest', url));
  window.location.href = `/import-manifest?${params.toString()}`;
}

// Usage
importManifests([
  'http://example.com/manifest1.json',
  'http://example.com/manifest2.json'
]);
```

### Embed in HTML
```html
<!-- Single button -->
<a href="/import-manifest?manifest=URL_ENCODED_MANIFEST" 
   class="btn btn-primary">
  Create Project
</a>

<!-- Or use a form -->
<form method="get" action="/import-manifest">
  <input type="url" name="manifest" placeholder="Manifest URL">
  <input type="submit" value="Import">
</form>
```

## Important Notes

✓ **URLs must be encoded** - Use `encodeURIComponent()` or URL encoder  
✓ **Valid IIIF manifests** - URLs should point to valid IIIF manifest.json files  
✓ **Authentication required** - Users must be signed into TPEN  
✓ **Duplicates filtered** - Same manifest URL won't create duplicate projects  
✓ **Mobile friendly** - Works on phones and tablets  
✓ **All errors handled** - Partial failures show success + error info  

## Testing

Visit this example with real manifests:

```
/import-manifest?manifest=http%3A%2F%2Fwww.e-codices.unifr.ch%2Fmetadata%2Fiiif%2Fsl-0002%2Fmanifest.json
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No Manifests Found" | Check that manifest parameters are in the URL |
| "Sign In Required" | User needs to authenticate with TPEN first |
| "Failed to create project" | Verify manifest URL is valid and accessible |
| Projects created but not shown | Refresh page or go back to TPEN home |

## File Locations

- **Component**: `/components/manifest-import/index.js`
- **Interface**: `/interfaces/manifest-import/index.html`
- **Examples**: `/interfaces/manifest-import/examples.html`
- **Docs**: `/components/manifest-import/README.md`

## Support Resources

- **Full Documentation**: See `/components/manifest-import/README.md`
- **Examples Page**: Visit `/interfaces/manifest-import/examples.html`
- **Implementation Details**: See `/components/manifest-import/IMPLEMENTATION.md`
- **Configuration**: See `/interfaces/manifest-import/manifest.yml`

---

**That's it!** The component handles everything else automatically. 🎉
