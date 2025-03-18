import Project from "../Project.js"
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe("Project", () => {
    it("should create a project with a this config", () => {
        const project = new Project({
            name: "Test Project",
            email: "test@example.com",
        })
        assert.equal(project.data.name, "Test Project")
        assert.equal(project.data.email, "test@example.com")
    })

    it("should initialize a project with this id", () => {
        const project = new Project("someHash")
        assert.equal(project.id, "someHash")
    })

    it("should fail to find a project with this id", () => {
        const project = new Project("someHash")
        assert.rejects(project.loadData())
    })
})
