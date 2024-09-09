---
title: User Class
author: <cubap@slu.edu>
layout: default
permalink: /interfaces/User/
tags: [tpen, api, javascript, interface]
---

The User class is used to represent an authenticated TPEN user. Interfaces in TPEN will often need details about the currently authenticated user as well as simple information about the users referenced as contributors, group members, etc.

### Constructor

The constructor for the User class is used to initialize the User object with an identifier unique among users.

An `idString` will be one of the following:

* A string that is a valid `_id` hexString from the private TPEN database
* A string that is a valid URI for the public Agent stored in RERUM or compatible repository
* The string ('any') to represent any authenticated User
* The string ('anonymous') to create an instance of a public User

If you are using the TPEN Authentication system, a logged in User will be available as `TPEN.currentUser`, which will include
an authentication token you may pass to the API.

```javascript
const user = new User(idString)
```

### Properties

The User class may have the following properties:

* `id`: The unique identifier for the user.
* `authenticationToken`: The authentication token for the user.
* `agent`: The identifying public Agent URI for the user.
* `displayName`: The name of the user intended for onscreen display in TPEN.
* `roles`: The roles for the user related to the `currentProject`.
* `permissions`: The permissions for the user related to the `currentProject`.
* `profile`: An object containing all profile information the User identified as publicly available. Some examples of values that may be made public include:
  * `profile.name`: The full name of the user intended for the public.
  * `profile.mbox`: The email address of the user.
  * `profile.avatar`: The URL to the user's avatar image.
  * `profile.website`: The URL to the user's website.
  * `profile.identities`: An array of URIs containing all identities the user has.
  * `profile.links`: An array of URIs containing all links related to this user.

### Methods

The User class has the following methods:

* `getProfile()`: Returns the profile information for the user.
* `getProjects()`: Returns a list of all the Projects the user has access to.
* `updateProfile()`: Updates the profile information for the `currentUser`. New keys are added and any keys set to `null` will be removed.
* `logout()`: Logs the user out of the current session.

### Implementation Notes

The permissions for a User are controlled by the Project. Changing the active Project will update the permissions for the authenticated User and reset all the group members. The `currentUser` is only changed by authentication and cannot be programmatically switched in an Interface.
