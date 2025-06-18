---
title: Building a Simple Interface - TPEN Cookbook
description: The start of anything.
author: <cubap@slu.edu>
layout: default
tags: [tpen, api, javascript, interface]
---

## Use Case

You are ready to connect your web application to TPEN data. You want to authenticate a user and 
get a list of their projects.

## Implementation Notes

TPEN 3.0 is built on a RESTful API. This means that you can use any HTTP client to connect to the API. 
It is possible to make non-traditional requests to the API, but guidance assumes that you are using a 
web browser or encapsulated web view. Some TPEN resources are available without authentication, but a 
useful interface will require authentication.

On the page where you would like to present the TPEN component, you will need to load the TPEN library. 
This is done by adding the following script tag to your HTML:

```html
<script src="https://app.t-pen.org/api/TPEN.js" type="module"></script>
```

This will load the TPEN library and make it available to your application. You can then use the TPEN 
object to access the API. The TPEN object is a singleton, so you can use it anywhere in your application. 
If you are building a Web Component or a React component, you can import the TPEN object directly into your 
project.

```javascript
import { TPEN } from 'https://app.t-pen.org/api/TPEN.js'
```

The [TPEN class docs](https://app.t-pen.org/classes/TPEN) provide a list of all the properties and methods 
available to you. Here are the most important ones:

### properties

TPEN properties typically update themselves and are not set directly.

* `TPEN.currentUser` - The current User object. This will be null if the user is not authenticated.
* `TPEN.activeProject` - The current Project object. This will be null if no project is selected.

### methods

These methods are available and may be called by your custom elements.

* `TPEN.attachAuthentication(myElement)` - This will attach the authentication process to the element you provide, logging the user in and redirecting them back to your application. This will also set the `TPEN.currentUser` property to the authenticated user.
* `TPEN.logout()` - This will log the user out of TPEN and clear local `TPEN` data.

### events

Subscribe to events with `TPEN.eventDispatcher.on('eventName', callback)` to always have the most up-to-date 
source of truth.

* `tpen-user-authenticated` - This event is fired when the user is authenticated and `TPEN.currentUser` is set.
* `tpen-project-loaded` - This event is fired when a project is loaded and `TPEN.activeProject` is set and automatically loads Projects from the URL.
* `tpen-toast` - Can be fired by an interface to display a message to the user. This is a simple way to display messages to the user without having to create a custom interface.

## Restrictions

The authentication process at TPEN 3.0 is not strictly secure. Your user will be redirected to login on 
t-pen.org and then redirected back to your application with an id token. The idiosyncratic nature of the 
TPEN ecosystem means no permissions, roles, or scopes are baked into this token. It is not an access token.

## Example

This interface surfaces the profile of a logged in user. All the code is available on GitHub at https://github.com/CenterForDigitalHumanities/TPEN-interfaces/tree/main/components/user-profile.

> index.js

```js
import TPEN from '../../api/TPEN.js'
const eventDispatcher = TPEN.eventDispatcher

class UserProfile extends HTMLElement {

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    eventDispatcher.on('tpen-user-loaded', ev => {
      // When the user is loaded, update the profile  
      // with the new current User data.
      this.updateProfile(TPEN.currentUser)
    })
  }

  connectedCallback() {
    // This is how we tell TPEN the element contains 
    // something requiring authentication.
    TPEN.attachAuthentication(this)
    // `render()` is called to set up the initial state of the element. 
    // It is usually best to only change what you need to.
    this.render()
  }

  updateProfile({...profile}) {
    // Every user has a profile object which will have at least 
    // a `displayName` and `agent` URI. Anything in `profile` is 
    // considered public and can be shared openly.
    this.shadowRoot.querySelector('#name').textContent = displayName
    this.shadowRoot.querySelector('#email').textContent = email
  }

  async render() {
    const showMetadata = this.hasAttribute('show-metadata') && this.getAttribute('show-metadata') !== 'false'
    this.shadowRoot.innerHTML = `
      <div>
        <p><em>Display Name:</em> <span id="name">loading...</span></p>
        <p><em>Email:</em> <span id="email">loading...</span></p>
      </div>
    `
  }
}

// This is how we register the element with the browser.
// The name must contain a hyphen and be unique to the page.
customElements.define('tpen-user-profile', UserProfile)
```

> index.html ([example](https://app.t-pen.org/components/user-profile/))

```html
<!DOCTYPE html>
<html lang="en">

  <head>
    <title>User Profile Module</title>
    <script src="index.js" type="module"></script>
  </head>

  <body>
    <h3>User Profile</h3>
    <tpen-user-profile></tpen-user-profile>
  </body>

</html>
```

## Related Recipes

* [Building a Complex Interface](building-a-complex-interface.html)
