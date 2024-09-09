---
title: TPEN Class
author: <cubap@slu.edu>
layout: default
permalink: /interfaces/TPEN/
tags: [tpen, api, javascript, interface]
---

The TPEN class is the main class for accessing the TPEN services API. It is used to
initialize the TPEN object and to make calls to the API.

### Constructor

The constructor for the TPEN class is used to initialize the TPEN object.
It takes an optional parameter for the URL to the Tiny Things RERUM proxy you are using
with your applications API key, defaulting to "[https://tiny.t‑pen.org](https://tiny.t-pen.org)".

```javascript
const tpen = new TPEN(tinyThingsURL?)
```

### Properties

The TPEN class has the following properties:

* `tinyThingsURL`: The URL to the Tiny Things RERUM proxy you are using with your applications API key.
* `servicesURL`: The URL to the TPEN services API, default to "[https://api.t‑pen.org](https://api.t-pen.org)".
* `currentUser`: The currently authenticated User, if any.
* `activeProject`: The currently active Project, if any.
* `activeCollection`: The currently active Collection, if any.

### Methods

The TPEN class has the following methods:

* `reset()`: Resets the TPEN object to its initial state.
* `getUser()`: Returns the currently authenticated User, if any.
* `getProject()`: Returns the currently active Project, if any.
* `getCollection()`: Returns the currently active Collection, if any.
* `getProjects()`: Returns a list of all the Projects the current user has access to.
* `createProject(data)`: TODO
* `createUser(data)`: TODO
* `createGroup(data)`: TODO
