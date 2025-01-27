---
title: Interfaces for TPEN
author: <cubap@slu.edu>
layout: default
tags: [tpen, api, javascript, interface]
---

This page is intended for developers and designers who are building interfaces for
use with the TPEN services at t‑pen.org. The following classes are available for you
to use with the interfaces library for more easily accessing the services API in
your javaScript project.

## [TPEN](./TPEN)

The TPEN class is the main class for accessing the TPEN services API. It is used to
initialize the TPEN module and to make calls to the API.

```javascript
const tpen = new Tpen(tinyThingsURL?)
```

## [User](./User)

The User class is used to represent an authenticated TPEN user. Interfaces in TPEN will often need details about the currently authenticated user as well as simple information about the users referenced as contributors, group members, etc.

```js
new User(idString?)
```

## [Project](./Project)

<!-- include_relative ./Project.md -->

## [Group](./Group)

<!-- include_relative ./Group.md -->
