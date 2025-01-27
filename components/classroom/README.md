# T-PEN Project Overview

T-PEN (Transcription for Paleographical and Editorial Notation) is a web-based tool 
designed for working with images of manuscripts. It allows users to attach transcription 
data to the actual lines of the original manuscript in a simple, flexible interface.

## T-PEN API

The T-PEN API provides various endpoints to interact with the T-PEN system programmatically. 
Here are some key features:

- **Authentication**: Secure access to the T-PEN system.
- **Project Management**: Create, update, and manage transcription projects.
- **Image Handling**: Upload and manage manuscript images.
- **Transcription Services**: Submit and retrieve transcriptions linked to manuscript images.

## T-PEN Data Services

T-PEN provides multiple tools to help with transcribing and annotating manuscripts.

- **Image Annotation**: Users can annotate specific lines or sections of manuscript images.
- **Data Export**: Transcriptions and annotations can be exported in numerous formats for further analysis or publication.
- **Collaboration Tools**: Multiple users can work on the same project, with tools for tracking changes and managing contributions.

## Connecting to T-PEN Data Services

1. **Create an Account**: Sign up for a T-PEN account on the website https://t-pen.org/TPEN/
2. **Upload Manuscripts**: Upload digital images of manuscripts you wish to transcribe.
3. **Start Transcribing**: Use the transcription interface to begin transcribing the text.
4. **Annotate and Collaborate**: Utilize the annotation tools and invite collaborators to join your project.
5. **Export Data**: Once your transcription is complete, export the data in your preferred format.

## User Guide Best Practices

* `index.html`: The default interface to launch,
* TPEN interface suports many files e.g. `*js`, `*.css`, `*.html`, etc.,
* Configuration files: `manifest.yml` or `manifest.json`

## Useful APIs for Classroom Group Interface

For a classroom group interface, the following APIs might be useful:

1. **User Management API**: To handle user authentication, roles, and permissions.
2. **Project Collaboration API**: To manage group projects, track contributions, and facilitate collaborative work.
3. **Annotation API**: To allow students to annotate and comment on manuscript images.
4. **Export API**: To enable students to export their work in various formats for presentations or further study.

# T-PEN Classroom Interface

This folder (TPEN-Interfaces/components/classroom) contains code for a TPEN Classroom interface, meant to organize transcription users within a classroom setting.

## Roles and Permissions

Roles and permissions for users are defined within the `groups` folder. These determine what entities, actions, and scopes specific users have access to within the classroom group.

* `roles.mjs`: defines a Roles object, made of 3 separate roles:
    1. OWNER
    2. LEADER
    3. CONTRIBUTOR
* `permissions_parameters.mjs`: defines 3 objects and their corresponding permissions:
    1. `ACTION`: READ, UPDATE, DELETE, CREATE, ALL
    2. `SCOPE`: METADATA, TEXT, ORDER, SELECTOR, DESCRIPTION, ALL
    3. `ENTITIES`: PROJECT, MEMBER, LAYER, PAGE, LINE, ROLE, PERMISSION, ALL
* `permissions.mjs`:
    - The `Permissions` object contains the specific permissions granted to each role, with each permission in string format 'ACTION_SCOPE_ENTITY'.
    - `generatePatterns(action, scope, entity)`: returns specific string patterns of permissions using an input of action, scope, and entity.
    - `checkPermissions(role, action, scope, entity)`: validates whether a specific role can perform an action on a particular entity and scope.
    - `createCustomRole(role)`: creates a custom role based on input to be added to the Roles object.
    - `addPermission(role,action,scope,entity)`: adds a new permission to a specific role in Permissions using the predefined actions, scopes, and entities.
* `checkPermissions.mjs`: contains function `hasPermission(role, action, scope, entity)`, which checks if a role has permission for a specific action on an entity within a given scope, considering various permission patterns.

## Fetching Accounts and Projects
The TPEN API is utilized within `fetchData.mjs` to retrieve project data and its corresponding users based on project ID. To display this data, the `ClassroomGroup` component within `web-component.js` is called and displayed within the classroom interface's homepage `index.html`. Users are authorized with the `AuthButton` component within `auth-button.js`.