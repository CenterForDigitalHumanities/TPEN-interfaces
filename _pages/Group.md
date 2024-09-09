---
title: Group Class
author: <cubap@slu.edu>
layout: default
permalink: /interfaces/Group/
tags: [tpen, api, javascript, interface]
---

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
