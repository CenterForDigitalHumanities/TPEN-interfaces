---
title: Interfaces for TPEN
author: <cubap@slu.edu>
layout: default
permalink: /interfaces/
tags: [tpen, api, javascript, interface]
---

This page is intended for developers and designers who are building interfaces for
use with the TPEN services at t‑pen.org. The following classes are available for you
to use with the interfaces library for more easily accessing the services API in
your javaScript project.

## TPEN

The TPEN class is the main class for accessing the TPEN services API. It is used to
initialize the TPEN object and to make calls to the API.

### Constructor

The constructor for the TPEN class is used to initialize the TPEN object.
It takes an optional parameter for the URL to the Tiny Things RERUM proxy you are using
with your applications API key, defaulting to "[https://tiny.t‑pen.org](https://tiny.t-pen.org)".

```javascript
const tpen = new Tpen(tinyThingsURL?)
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

## User

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
* `agent`: The Agent URI for the user.
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
* `logout()`: Logs the user out of the current session.
* `updateProfile()`: Updates the profile information for the `currentUser`. New keys are added and any keys set to `null` will be removed.

### Implementation Notes

The permissions for a User are controlled by the Project. Changing the active Project will update the permissions for the authenticated User and reset all the group members. The `currentUser` is only changed by authentication and cannot be programmatically switched in an Interface.

## Project

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

## Group

The Group class is used to represent a TPEN Group. A single Group may control multiple Projects or a Collections. Be cautious when changing membership, roles, or permissions, as it may impact other projects.

### Constructor

The constructor for the Group class is used to initialize the Group object with an identifier unique among groups. There is only one Group available at a time, and it is always the `currentGroup`, initialized when `activeProject` is set.

### Properties

The Group class may have the following properties:

* `id`: The unique identifier for the group.
* `slug`: A slugified string to reference the group.
* `label`: A human‑readable name for the Group in displays.
* `members`: An array of Users that have access to this project.
* `roles`: An array of role objects and thier permissions.
* `options`: A flexible configuration object, setting new Project settings in this Group.
* `tags`: An array of strings containing the tags.

### Methods

The Group class has the following methods:

* `getMembers()`: Returns a list of all the Users that have access to this project.
* `getProjects()`: Returns a list of all the Projects that belong to this group.
* `removeMember(user)`: Removes the specified User from this project.
* `addMember(user)`: Adds the specified User to this project.
* `modifyRole(user, role)`: Modifies the role for the specified User.
* `inviteMember(email)`: Invites the specified email address to join this project.
* `update(data)`: Updates the group with the specified data. New keys will be added, any keys set to `null` will be removed. Some keys are immutable.
* `fork()`: Creates a new Group with the same members and roles.

### Implementation Notes

Any changes to a Group may impact other Projects controlled by this group. If this is not
intended, be sure to fork the group first so that changes are limited to the current project.
