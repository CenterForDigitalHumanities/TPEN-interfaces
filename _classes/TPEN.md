---
title: TPEN Class
author: <cubap@slu.edu>
layout: default
tags: [tpen, api, javascript, interface]
---

The TPEN class is the main class for accessing the TPEN services API. It is used to
initialize the TPEN module and to make calls to the API.

- [Constructor](#constructor)
- [Properties](#properties)
- [Methods](#methods)
  - [`reset(force)`](#resetforce)
  - [`getUser()`](#getuser)
  - [`getActiveProject()`](#getactiveproject)
  - [`getActiveCollection()`](#getactivecollection)
  - [`getUserProjects()`](#getuserprojects)
  - [`getAllPublicProjects()`](#getallpublicprojects)
  - [`logout()`](#logout)
  - [`login()`](#login)
  - [`authenticate()`](#authenticate)

## Constructor

The constructor for the TPEN class is used to initialize the TPEN module.
It takes an optional parameter for the URL to the Tiny Things RERUM proxy you are using
with your applications API key, defaulting to "[https://tiny.t‑pen.org](https://tiny.t-pen.org)".

```javascript
const tpen = new TPEN(tinyThingsURL?)
```

## Properties

The TPEN class has the following properties:

* `tinyThingsURL`: The URL to the Tiny Things RERUM proxy you are using with your application's API key.
* `servicesURL`: The URL to the TPEN services API, default to "[https://api.t‑pen.org](https://api.t-pen.org)".
* `currentUser`: The id of the currently authenticated User, if any.
* `activeProject`: The id of the currently active Project, if any.
* `activeCollection`: The id of the currently active Collection, if any.

## Methods

### `reset(force)`

Resets the TPEN object to its initial state. This is useful for an interface that needs to be sure there is no more pending operations on the server.

#### Returns (Promise)

* Resolve(`Array` | undefined): List of pending actions, killed if `force`
* Reject(`Array` | `Error`): List of pending actions blocking reset or 500 server error.

### `getUser()`

Returns the currently authenticated [User](./User), if any.

@alias for `new User(TPEN.currentUser)`

### `getActiveProject()`

Returns the currently active [Project](./Project), if any.

@alias for `new Project(TPEN.activeProject)`

### `getActiveCollection()`

Returns the currently active [Collection](./Collection), if any.

@alias for `new Project(TPEN.activeCollection)`

### `getUserProjects()`

Returns a list of all the [Projects the current user](./User.md) has access to.

@alias for `User(TPEN.currentUser).getUserProjects()`

### `getAllPublicProjects()`

Returns the list of all public Projects and Collections (as `id`/`title` stubs) in the TPEN database as a JSON Array.

### `logout()`

Logout the `currentUser` of the browser session.

### `login()`

Forces the login/signup interface to appear, even if the user is currently logged in. After the authentication, the current page will attempt to reload with an authenticated User.

### `authenticate()`

Attempts to silently log into TPEN and launches the login/signup interface if no User is found. After the authentication, the current page will attempt to reload with an authenticated User.
