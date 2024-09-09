---
title: Project Class
author: <cubap@slu.edu>
layout: default
permalink: /interfaces/Project/
tags: [tpen, api, javascript, interface]
---

The Project class is used to represent a TPEN Project. A single User may have access to multiple Projects. Projects may be clustered together into Collections. Only one Project may be active at a time. If your Interface requires multiple projects active, they must be individually scoped.

### Constructor

The constructor for the Project class is used to initialize the Project object with an identifier unique among projects.

An `idString` will be one of the following:

* A string that is a valid `_id` hexString from the private TPEN database
* A string that is a valid URI for the public Project stored in RERUM or compatible repository

```javascript
const project = new Project(idString)
```

### Properties

The Project class may have the following properties:

* `id`: The unique identifier for the project.
* `title`: The label intended for human interfaces.
* `manifest`: The URI of the manifest this was originally based on.
* `viewer`: The URL of a readonly viewer Interface registered with this project.
* `annotator`: The URL of the default annotation Interface used for transcription or other annotation.
* `creator`: The Agent URI of the Project's creator.
* `group`: The `id` for the group of contributors with access to this Project
* `license`: A reference or link to the license for this project.
* `tags`: An array of strings containing the tags for this project.
* `tools`: An array of related tools as URLs.
* `options`: A flexible configuration object for this project.

### Methods

The Project class has the following methods:

* `getCollections()`: Returns a list of all the Collections that contain this project.
* `delete()`: Marks the Project for deletion.
* `update(data)`: Updates the project with the specified data. New keys will be added, any keys set to `null` will be removed. Some keys are immutable.
* `misc()`: more methods for simple changing of single properties TODO

### Implementation Notes

The available information for any Project may be limited to that User's role within it.
While all Projects will have at least an `id`, `creator`, `members`, and `license`, changing the currentUser may change available Project properties.
