---
title: Interfaces for TPEN
author: <cubap@slu.edu>
layout: default
permalink: /components/
tags: [tpen, api, javascript, interface]
---

This page is intended for developers and designers who are building interfaces for
use with the TPEN services at t‑pen.org. This brief guide to Web Components should 
help you get started.

## Web Components

Web Components are a set of web platform APIs that allow you to create new custom, 
reusable, encapsulated HTML tags to use in web pages and web apps. Custom components 
and widgets built on the Web Component standards will work across modern browsers, 
and can be used with any JavaScript library or framework that works with HTML.
Though many frameworks and libraries like React, Angular, and Vue have their own 
component systems, Web Components provide a standard that works across all of them. 
The opinion of TPEN, then, is that for longevity, the most vanilla approach is best.

## Custom Elements

Generally speaking, this repository is designed to cover interfaces that are built 
specifically for TPEN. If your custom element does not require any TPEN data, you 
should consider using a more general repository such as a IIIF viewer or a text 
service. A relevant contribution may require a userToken or projectID, which is 
specific to TPEN. It may also be useful to create an interface that is specific to 
TPEN-flavored documents, such as an Annotation Page that is expected to be a layer 
of transcription which identifies the Annotation Collection to which it belongs.
On the other hand, an element that renders out a IIIF Canvas or a Web Annotation 
might be better submitted to a repository like [canvas-panel](https://canvas-panel.digirati.com/).

## Getting Started

The basic shape of a Web Component is as follows:

```javascript
      class MyElement extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({mode: 'open'});
          this.shadowRoot.innerHTML = `<p>Hello, World!</p>`;
        }
      }
      customElements.define('my-element', MyElement);
```

Used like this:

```html
<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <my-element></my-element>
  </body>
</html>
```

## todo

comments about the Events system we have, when you should have access to what, how to auth
