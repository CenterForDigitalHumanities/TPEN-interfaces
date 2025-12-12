# TPEN Interfaces

These vanilla default and internally useful interfaces for the TPEN ecosystem that
exemplify how you might build your own interfaces for specific projects. The directories
each contain a named interface that serves as an example for how an external developer
might use the [TPEN Services](#) API to implement a custom interface that leverages
the TPEN platform. Interfaces are typically a web application, a simple HTML document,
that utilizes Web Components that might be reused by others.

## The shape of things

The directories here each contain an example of an interface that uses the TPEN
authentication and interactions with the TPEN platform. As an example, the default
location for the transcription action is `https://tpen.rerum.io/interfaces/transcribe`
and returns the file in `/transcription/index.html`. If you have developed a project that
transcribes music and has helpful tools for layers music encoding and lyric
transcription, the project configuration can provide a custom location for the
`project_transcription` option, directing the user instead to
`https://example.com/musicproject/interfaces/transcribe.html` with a querystring that
includes the project ID. Examples here, of the best practice, include the following:

1. `index.html` The default interface to launch,
2. `*.js, *.css, *.html, etc.` Files in support of the Interface, and
3. `manifest.yml` or `manifest.json` Configuration for the Interface. [schema🔗](https://github.com/CenterForDigitalHumanities/TPEN-interfaces/issues/1)

## Examples and Services

Each Interface is self-contained and uses the [TPEN Services](#) API to create, modify, and
annotate web resources. Some examples, whether or not they are currently implemented include:

### /classroom-group

Assign a group of users to a team and set appropriate permissions. The User with a`project-admin` role can add users to the project group.

* `/addUser` to add an existing user with a certain role.
* `/inviteUser` to send a mailer to a user who is not a TPEN User yet.
* `/removeUser` to remove a user from the project group.
* `/setRole` to set the role of a user.
* `/setPermissions` to set the permissions of a role (existing or new).

The interface may be configured to add custom roles to a project group:

* `instructor` has permissions to `[manage-users, set-roles, modify-transcriptions-all, modify-regions-all, modify-project-all]` to create a class and review submissions.
* `assistant` has permissions to `[view-transcriptions-all]` to grade submissions.
* `student` has permissions to `[modify-transcriptions-self]` to only see their own work.

Any Interface can understand the enumerated permissions, so multiple transcription interfaces
might be helpful to complete an assignment.

### /transcribe-latin-poetry

Add text annotations to an image with tools that allow users to select words, phrases, and lines.

* `/getProject` to get the project by ID and popluate the page with existing image region annotations.
* `/userInfo` to get the user's role and permissions.
* `/updateAnnotation` to add text transcription to an image region.
* `/createAnnotation` to select a piece of the text annotation for scansion, structural annotations, or references.

The interface may add XML tags or shortcut buttons to add regular elements, provide
splitscreen tools specific to this purpose (dictionaries, word lists, etc.), and
saves the annotations in a format that can be imported into other transcription interfaces.
A viewer or transcription interface that doesn't understand the secondary annotations made
here will still be able to read the primary annotations.

### /manage-project-description

Add descriptive key-value pairs to a project. This might be used to make a list of projects
easier to filter or more discoverable from an external source. On its own, this may not mean
much but combined with a customized project list page, it could be a powerful tool.

## License

This repository is dual-licensed:

- **Code**: Apache License 2.0 — see [LICENSE](LICENSE)
- **Content** (documentation, images, transcriptions, and other non-code assets): Creative Commons Attribution 4.0 International — see [LICENSE-CONTENT](LICENSE-CONTENT)

When redistributing or reusing materials from this repository, please preserve these license files and copyright notices.

