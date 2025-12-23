# Manage Columns Interface

This interface provides core functionality for managing columns on a page, which is essential for setting up Lines on a Page in TPEN.

## Access

The interface is available at `/manage-columns` with the following required URL parameters:

- `projectID` - The ID of the project
- `pageID` - The ID of the annotation page (without the RERUM URL prefix)

Example:
```
/manage-columns?projectID=12345&pageID=abc123def456
```

## Features

### Create New Column
1. Click on annotations in the image to select them
2. Use Shift+Click to select a range of annotations
3. Use Ctrl/Cmd+Click to toggle individual annotations
4. Enter a column title
5. Click "Create Column" to save

### Merge Columns
1. Check the "Merge Columns Mode" checkbox
2. Select the columns you want to merge by clicking their buttons
3. Enter a new column label
4. Click "Merge Columns"

### Extend Column
1. Check the "Extend Column Mode" checkbox
2. Select the column you want to extend
3. Click on annotations to add to the column
4. Click "Extend Column"

### Clear All
Click "Clear All" to remove all columns from the page.

## Technical Details

- Custom element: `<tpen-manage-columns>`
- Uses TPEN authentication
- Integrates with TPEN services API
- Uses CSS variables for theming
- Stores selection state in localStorage for convenience
