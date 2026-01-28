# Manifest Import Component

This component allows users to import multiple IIIF manifests directly into TPEN and create projects from them in one streamlined flow.

## Features

- **Multi-Manifest Support**: Import multiple manifests via query parameters
- **Automatic Authentication**: Prompts for login if not authenticated
- **Real-time Progress**: Shows loader while projects are being created
- **Batch Results**: Displays all created projects and any failures
- **Quick Actions**: Direct links to transcribe, manage, or view projects
- **Responsive Design**: Works on desktop and mobile devices

## Usage

### URL Format

Create a link with `manifest` query parameters for each IIIF manifest you want to import:

```
https://tpen.rerum.io/import-manifest?manifest=URL1&manifest=URL2
```

### Example

```
/?manifest=http%3A%2F%2Fwww.e-codices.unifr.ch%2Fmetadata%2Fiiif%2Fsl-0002%2Fmanifest.json&manifest=https%3A%2F%2Fcdm16821.contentdm.oclc.org%2Fiiif%2Fp16821coll4%3A2%2Fmanifest.json
```

Decoded:
```
/?manifest=http://www.e-codices.unifr.ch/metadata/iiif/sl-0002/manifest.json&manifest=https://cdm16821.contentdm.oclc.org/iiif/p16821coll4:2/manifest.json
```

## User Flow

1. **Landing**: User arrives with manifest URLs in query parameters
2. **Authentication**: If not logged in, prompts user to sign in
3. **Creation**: After auth, shows a loading screen while projects are being imported
4. **Results**: Displays all successfully created projects with action buttons, and any failed imports with error messages
5. **Navigation**: Users can navigate back to TPEN, view projects, or transcribe directly

## Component Structure

### `tpen-manifest-import`

Web component that handles the entire manifest import workflow.

#### Methods

- `load()` - Initializes the component, checks auth, and starts the import process
- `#extractManifests()` - Parses manifest URLs from query parameters (removes duplicates)
- `#createProjects()` - Creates projects from all manifests sequentially
- `#importManifest(manifestUrl)` - Makes API call to create project from a single manifest
- `render*()` - Methods to render different UI states

#### Render States

1. **renderNeedAuth()** - Shows login prompt if not authenticated
2. **renderNoManifests()** - Shows error if no manifests in URL
3. **renderCreating()** - Shows loader with progress text
4. **renderResults()** - Shows created projects and any errors

## API Integration

The component uses the TPEN Services API endpoint:

```
POST /project/import?createFrom=URL
{
  "url": "https://example.com/manifest.json"
}
```

**Response** (on success):
```json
{
  "_id": "project-id",
  "label": "Project Label",
  "layers": [...],
  "metadata": [...],
  ...
}
```

## Error Handling

- **Network errors**: Caught and displayed in results
- **Auth failures**: Redirects to TPEN login
- **Invalid manifests**: Shown in failed section with error message
- **Partial failures**: Successfully created projects still display

## Styling

The component uses CSS custom properties for theming:
- `--primary-color`: Primary action button color (default: #0066cc)
- `--success-color`: Success indicator color (default: #4caf50)
- `--error-color`: Error indicator color (default: #d32f2f)
- `--bg-light`: Light background (default: #f5f5f5)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Files

- `/components/manifest-import/index.js` - Component implementation
- `/interfaces/manifest-import/index.html` - Interface page
