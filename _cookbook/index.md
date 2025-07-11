---
title: TPEN Cookbook
description: TPEN Cookbook for designing your own interfaces for interacting with the TPEN API.
author: <cubap@slu.edu>
layout: default
tags: [tpen, api, javascript, interface]
---

## Cookbook summary

Linking the TPEN Interfaces library within your own application is a simple way to access the API 
provided by TPEN Services. While you may directly use the API, this script file will provide you with 
a few simple classes ([described here](/interfaces)) to help you build your own interface.

After loading the library to your page, component, or module, a `TPEN` object will be available to you.
All other classes and their methods will be in that namespace.

```javascript
<script src="https://app.t-pen.org/api/TPEN.js" type="module"></script>
```

The classes provided will return JSON for processing by your own interfaces with no opinion about how 
it is displayed. Some data may be different depending on whether you are sending an authenticated user 
token along with it. Using the built in `TPEN.currentUser` with the &lt;auth-button> component will 
automatically send the user's token with each request. If you are using some other auth scheme, this is 
a good place to connect it.

## Cookbook

Recipes for building interfaces to interact with the TPEN API. These recipes cover real-world use cases and demonstrate how to leverage TPEN's architecture and features effectively.

### Getting Started
* [Building a Simple Interface](building-a-simple-interface.html) - Basic patterns for creating TPEN interfaces
* [Building a Complex Interface](building-a-complex-interface.html) - Advanced patterns for full-featured applications

### Authentication & User Management
* [User Authentication and Permissions](user-authentication-permissions.html) - Implementing secure authentication, user profiles, and role-based access control

### Project Management
* [Project Management Workflows](project-management-workflows.html) - Comprehensive project lifecycle management, from creation to collaboration

### Educational Use Cases
* [Classroom Group Management](classroom-group-management.html) - Managing classes, students, assignments, and educational workflows

### Transcription & Annotation
* [Transcription Interface Patterns](transcription-interface-patterns.html) - Specialized transcription interfaces for various scholarly needs

### Advanced Topics
* [Component Integration](component-integration.html) - Using and combining TPEN's Web Components effectively
* [API Best Practices](api-best-practices.html) - Optimal patterns for working with TPEN's API classes
* [Performance Optimization](performance-optimization.html) - Techniques for building fast, responsive interfaces
