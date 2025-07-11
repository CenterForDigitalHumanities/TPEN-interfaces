---
title: Classroom Group Management - TPEN Cookbook
description: Managing classroom groups, student assignments, and educational workflows
author: <cubap@slu.edu>
layout: default
tags: [tpen, classroom, education, groups, assignments, permissions]
---

## Use Case

You need to implement a classroom management system for TPEN that allows instructors to create classes, manage student enrollments, assign projects, set deadlines, and track student progress. This covers the complete educational workflow from course setup to grading.

## Implementation Notes

Educational interfaces require specialized permission systems, assignment management, and progress tracking. This recipe demonstrates how to build interfaces that support common classroom workflows while maintaining academic integrity.

## Class Creation and Management

### 1. Classroom Setup Component

```javascript
import { TPEN } from 'https://app.t-pen.org/api/TPEN.js'

class ClassroomManager extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.currentClass = null
    this.students = []
    this.assignments = []
    this.classRoles = {
      instructor: {
        permissions: ['manage-class', 'create-assignments', 'view-all-work', 'grade-assignments'],
        description: 'Full access to class management'
      },
      assistant: {
        permissions: ['view-all-work', 'grade-assignments'],
        description: 'Can view and grade student work'
      },
      student: {
        permissions: ['view-assignments', 'submit-work'],
        description: 'Can view assignments and submit work'
      }
    }
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    this.render()
  }
  
  async createClass(classData) {
    try {
      // Create the class as a special project type
      const classProject = await TPEN.Project.create({
        title: classData.title,
        description: classData.description,
        type: 'classroom',
        settings: {
          isClassroom: true,
          semester: classData.semester,
          year: classData.year,
          institution: classData.institution,
          courseCode: classData.courseCode
        },
        metadata: {
          instructor: TPEN.currentUser.id,
          createdAt: new Date().toISOString(),
          maxStudents: classData.maxStudents || 50
        }
      })
      
      // Set instructor permissions
      await this.setupInstructorPermissions(classProject)
      
      this.currentClass = classProject
      this.render()
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Class created successfully',
        type: 'success'
      })
      
      return classProject
    } catch (error) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: `Failed to create class: ${error.message}`,
        type: 'error'
      })
      throw error
    }
  }
  
  async setupInstructorPermissions(classProject) {
    // Grant instructor permissions
    await classProject.setUserRole(TPEN.currentUser.id, 'instructor')
  }
  
  async enrollStudent(studentEmail, role = 'student') {
    try {
      if (!this.currentClass) {
        throw new Error('No class selected')
      }
      
      // Check if user has permission to enroll students
      const canManage = await this.hasPermission('manage-class')
      if (!canManage) {
        throw new Error('Permission denied')
      }
      
      // Add student to class
      await this.currentClass.addCollaborator(studentEmail, role)
      
      // Send enrollment notification
      await this.sendEnrollmentNotification(studentEmail)
      
      // Refresh student list
      await this.loadStudents()
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: `Student ${studentEmail} enrolled successfully`,
        type: 'success'
      })
      
    } catch (error) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: `Failed to enroll student: ${error.message}`,
        type: 'error'
      })
    }
  }
  
  async loadStudents() {
    if (!this.currentClass) return
    
    try {
      const collaborators = await this.currentClass.getCollaborators()
      this.students = collaborators.filter(c => c.role === 'student')
      this.render()
    } catch (error) {
      console.error('Failed to load students:', error)
    }
  }
  
  async sendEnrollmentNotification(email) {
    // Send email notification to student
    try {
      await fetch('/api/notifications/enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TPEN.currentUser.token}`
        },
        body: JSON.stringify({
          recipient: email,
          className: this.currentClass.title,
          classId: this.currentClass.id,
          instructorName: TPEN.currentUser.displayName
        })
      })
    } catch (error) {
      console.warn('Failed to send enrollment notification:', error)
    }
  }
  
  async hasPermission(permission) {
    if (!TPEN.currentUser || !this.currentClass) return false
    
    try {
      const userRole = await this.currentClass.getUserRole(TPEN.currentUser.id)
      return this.classRoles[userRole]?.permissions.includes(permission) || false
    } catch (error) {
      return false
    }
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .classroom-manager {
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        .class-header {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border: 1px solid #e0e0e0;
        }
        .class-title {
          margin: 0 0 1rem 0;
          color: #333;
        }
        .class-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .info-item {
          background: white;
          padding: 1rem;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        .info-label {
          font-weight: bold;
          color: #666;
          font-size: 0.9rem;
        }
        .info-value {
          margin-top: 0.5rem;
          font-size: 1.1rem;
        }
        .action-sections {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        .section {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        .section h3 {
          margin-top: 0;
          color: #333;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .student-list {
          max-height: 300px;
          overflow-y: auto;
        }
        .student-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border-bottom: 1px solid #f0f0f0;
        }
        .student-info {
          flex: 1;
        }
        .student-name {
          font-weight: bold;
        }
        .student-email {
          color: #666;
          font-size: 0.9rem;
        }
        .student-role {
          padding: 0.25rem 0.75rem;
          background: #e7f3ff;
          border-radius: 12px;
          font-size: 0.8rem;
          margin-left: 1rem;
        }
        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .btn:hover { opacity: 0.9; }
        .create-class-form {
          background: #f8f9fa;
          padding: 2rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }
      </style>
      
      <div class="classroom-manager">
        ${!this.currentClass ? `
          <div class="create-class-form">
            <h2>Create New Class</h2>
            <form id="createClassForm">
              <div class="form-group">
                <label for="title">Class Title</label>
                <input type="text" id="title" name="title" required 
                       placeholder="e.g., Introduction to Digital Humanities">
              </div>
              
              <div class="form-group">
                <label for="courseCode">Course Code</label>
                <input type="text" id="courseCode" name="courseCode" 
                       placeholder="e.g., DH101">
              </div>
              
              <div class="form-group">
                <label for="semester">Semester</label>
                <select id="semester" name="semester">
                  <option value="fall">Fall</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="year">Year</label>
                <input type="number" id="year" name="year" 
                       value="${new Date().getFullYear()}" min="2020" max="2030">
              </div>
              
              <div class="form-group">
                <label for="institution">Institution</label>
                <input type="text" id="institution" name="institution" 
                       placeholder="Your Institution Name">
              </div>
              
              <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description" name="description" rows="3" 
                          placeholder="Course description..."></textarea>
              </div>
              
              <button type="submit" class="btn btn-primary">Create Class</button>
            </form>
          </div>
        ` : `
          <div class="class-header">
            <h1 class="class-title">${this.currentClass.title}</h1>
            <p>${this.currentClass.description}</p>
            
            <div class="class-info">
              <div class="info-item">
                <div class="info-label">Course Code</div>
                <div class="info-value">${this.currentClass.settings?.courseCode || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Semester</div>
                <div class="info-value">${this.currentClass.settings?.semester || 'N/A'} ${this.currentClass.settings?.year || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Students Enrolled</div>
                <div class="info-value">${this.students.length}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Institution</div>
                <div class="info-value">${this.currentClass.settings?.institution || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div class="action-sections">
            <div class="section">
              <h3>Enroll Students</h3>
              <form id="enrollStudentForm">
                <div class="form-group">
                  <label for="studentEmail">Student Email</label>
                  <input type="email" id="studentEmail" name="studentEmail" required>
                </div>
                <div class="form-group">
                  <label for="studentRole">Role</label>
                  <select id="studentRole" name="studentRole">
                    <option value="student">Student</option>
                    <option value="assistant">Teaching Assistant</option>
                  </select>
                </div>
                <button type="submit" class="btn btn-success">Enroll Student</button>
              </form>
            </div>
            
            <div class="section">
              <h3>Enrolled Students (${this.students.length})</h3>
              <div class="student-list">
                ${this.students.length === 0 ? '<p>No students enrolled yet</p>' : 
                  this.students.map(student => `
                    <div class="student-item">
                      <div class="student-info">
                        <div class="student-name">${student.displayName || student.email}</div>
                        <div class="student-email">${student.email}</div>
                      </div>
                      <div class="student-role">${student.role}</div>
                    </div>
                  `).join('')
                }
              </div>
            </div>
          </div>
        `}
      </div>
    `
    
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    const createForm = this.shadowRoot.querySelector('#createClassForm')
    if (createForm) {
      createForm.addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleCreateClass(e)
      })
    }
    
    const enrollForm = this.shadowRoot.querySelector('#enrollStudentForm')
    if (enrollForm) {
      enrollForm.addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleEnrollStudent(e)
      })
    }
  }
  
  async handleCreateClass(event) {
    const formData = new FormData(event.target)
    const classData = {
      title: formData.get('title'),
      courseCode: formData.get('courseCode'),
      semester: formData.get('semester'),
      year: formData.get('year'),
      institution: formData.get('institution'),
      description: formData.get('description')
    }
    
    try {
      await this.createClass(classData)
      await this.loadStudents()
    } catch (error) {
      // Error already handled in createClass
    }
  }
  
  async handleEnrollStudent(event) {
    const formData = new FormData(event.target)
    const studentEmail = formData.get('studentEmail')
    const studentRole = formData.get('studentRole')
    
    await this.enrollStudent(studentEmail, studentRole)
    event.target.reset()
  }
}

customElements.define('tpen-classroom-manager', ClassroomManager)
```

### 2. Assignment Management

```javascript
class AssignmentManager extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.currentClass = null
    this.assignments = []
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    
    TPEN.eventDispatcher.on('tpen-project-loaded', async (project) => {
      if (project.type === 'classroom') {
        this.currentClass = project
        await this.loadAssignments()
      }
    })
    
    this.render()
  }
  
  async createAssignment(assignmentData) {
    try {
      // Create assignment as a sub-project
      const assignment = await TPEN.Project.create({
        title: assignmentData.title,
        description: assignmentData.description,
        type: 'assignment',
        parentClass: this.currentClass.id,
        settings: {
          dueDate: assignmentData.dueDate,
          maxPoints: assignmentData.maxPoints,
          allowLateSubmissions: assignmentData.allowLateSubmissions,
          submissionType: assignmentData.submissionType,
          instructions: assignmentData.instructions
        },
        metadata: {
          createdAt: new Date().toISOString(),
          instructor: TPEN.currentUser.id
        }
      })
      
      // Share assignment with all students in the class
      await this.shareWithStudents(assignment)
      
      await this.loadAssignments()
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Assignment created successfully',
        type: 'success'
      })
      
      return assignment
    } catch (error) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: `Failed to create assignment: ${error.message}`,
        type: 'error'
      })
      throw error
    }
  }
  
  async shareWithStudents(assignment) {
    try {
      const students = await this.getClassStudents()
      
      for (const student of students) {
        await assignment.addCollaborator(student.email, 'student')
      }
    } catch (error) {
      console.error('Failed to share assignment with students:', error)
    }
  }
  
  async getClassStudents() {
    if (!this.currentClass) return []
    
    try {
      const collaborators = await this.currentClass.getCollaborators()
      return collaborators.filter(c => c.role === 'student')
    } catch (error) {
      console.error('Failed to get class students:', error)
      return []
    }
  }
  
  async loadAssignments() {
    if (!this.currentClass) return
    
    try {
      // Get all assignments for this class
      const assignments = await TPEN.Project.getByParent(this.currentClass.id)
      this.assignments = assignments.filter(a => a.type === 'assignment')
      this.render()
    } catch (error) {
      console.error('Failed to load assignments:', error)
    }
  }
  
  async getAssignmentSubmissions(assignmentId) {
    try {
      const assignment = await TPEN.Project.load(assignmentId)
      const submissions = await assignment.getSubmissions()
      return submissions
    } catch (error) {
      console.error('Failed to get submissions:', error)
      return []
    }
  }
  
  render() {
    if (!this.currentClass) {
      this.shadowRoot.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <p>Please select a class to manage assignments.</p>
        </div>
      `
      return
    }
    
    this.shadowRoot.innerHTML = `
      <style>
        .assignment-manager {
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        .create-assignment {
          background: #f8f9fa;
          padding: 2rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border: 1px solid #e0e0e0;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }
        .form-group input, .form-group select, .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .assignments-list {
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        .assignment-item {
          padding: 1.5rem;
          border-bottom: 1px solid #f0f0f0;
        }
        .assignment-item:last-child {
          border-bottom: none;
        }
        .assignment-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        .assignment-title {
          font-size: 1.2rem;
          font-weight: bold;
          color: #333;
          margin: 0;
        }
        .assignment-status {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .status-active { background: #d4edda; color: #155724; }
        .status-upcoming { background: #fff3cd; color: #856404; }
        .status-past { background: #f8d7da; color: #721c24; }
        .assignment-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .detail-item {
          font-size: 0.9rem;
        }
        .detail-label {
          font-weight: bold;
          color: #666;
        }
        .assignment-actions {
          display: flex;
          gap: 0.5rem;
        }
        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
      </style>
      
      <div class="assignment-manager">
        <h2>Assignment Management</h2>
        
        <div class="create-assignment">
          <h3>Create New Assignment</h3>
          <form id="createAssignmentForm">
            <div class="form-group">
              <label for="title">Assignment Title</label>
              <input type="text" id="title" name="title" required>
            </div>
            
            <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" name="description" rows="3" required></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="dueDate">Due Date</label>
                <input type="datetime-local" id="dueDate" name="dueDate" required>
              </div>
              
              <div class="form-group">
                <label for="maxPoints">Maximum Points</label>
                <input type="number" id="maxPoints" name="maxPoints" min="0" step="0.1" value="100">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="submissionType">Submission Type</label>
                <select id="submissionType" name="submissionType">
                  <option value="transcription">Transcription</option>
                  <option value="annotation">Annotation</option>
                  <option value="project">Project</option>
                  <option value="text">Text Submission</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>
                  <input type="checkbox" id="allowLateSubmissions" name="allowLateSubmissions">
                  Allow Late Submissions
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="instructions">Instructions</label>
              <textarea id="instructions" name="instructions" rows="4" 
                        placeholder="Detailed instructions for students..."></textarea>
            </div>
            
            <button type="submit" class="btn btn-success">Create Assignment</button>
          </form>
        </div>
        
        <div class="assignments-list">
          <h3 style="padding: 1rem; margin: 0; border-bottom: 1px solid #f0f0f0;">
            Assignments (${this.assignments.length})
          </h3>
          
          ${this.assignments.length === 0 ? `
            <div style="padding: 2rem; text-align: center; color: #666;">
              No assignments created yet
            </div>
          ` : this.assignments.map(assignment => {
            const dueDate = new Date(assignment.settings.dueDate)
            const now = new Date()
            const status = now > dueDate ? 'past' : 
                          now > new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000) ? 'active' : 'upcoming'
            
            return `
              <div class="assignment-item">
                <div class="assignment-header">
                  <h4 class="assignment-title">${assignment.title}</h4>
                  <span class="assignment-status status-${status}">
                    ${status === 'past' ? 'Past Due' : status === 'active' ? 'Active' : 'Upcoming'}
                  </span>
                </div>
                
                <p>${assignment.description}</p>
                
                <div class="assignment-details">
                  <div class="detail-item">
                    <div class="detail-label">Due Date</div>
                    <div>${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString()}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Points</div>
                    <div>${assignment.settings.maxPoints}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Type</div>
                    <div>${assignment.settings.submissionType}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Late Submissions</div>
                    <div>${assignment.settings.allowLateSubmissions ? 'Allowed' : 'Not Allowed'}</div>
                  </div>
                </div>
                
                <div class="assignment-actions">
                  <button class="btn btn-primary" onclick="this.getRootNode().host.viewSubmissions('${assignment.id}')">
                    View Submissions
                  </button>
                  <button class="btn btn-secondary" onclick="this.getRootNode().host.editAssignment('${assignment.id}')">
                    Edit
                  </button>
                  <button class="btn btn-danger" onclick="this.getRootNode().host.deleteAssignment('${assignment.id}')">
                    Delete
                  </button>
                </div>
              </div>
            `
          }).join('')}
        </div>
      </div>
    `
    
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    const form = this.shadowRoot.querySelector('#createAssignmentForm')
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleCreateAssignment(e)
      })
    }
  }
  
  async handleCreateAssignment(event) {
    const formData = new FormData(event.target)
    const assignmentData = {
      title: formData.get('title'),
      description: formData.get('description'),
      dueDate: formData.get('dueDate'),
      maxPoints: parseFloat(formData.get('maxPoints')),
      submissionType: formData.get('submissionType'),
      allowLateSubmissions: formData.has('allowLateSubmissions'),
      instructions: formData.get('instructions')
    }
    
    try {
      await this.createAssignment(assignmentData)
      event.target.reset()
    } catch (error) {
      // Error already handled in createAssignment
    }
  }
  
  async viewSubmissions(assignmentId) {
    // Navigate to submissions view
    window.location.href = `/interfaces/classroom/submissions/?assignment=${assignmentId}`
  }
  
  async editAssignment(assignmentId) {
    // Navigate to assignment editor
    window.location.href = `/interfaces/classroom/edit-assignment/?assignment=${assignmentId}`
  }
  
  async deleteAssignment(assignmentId) {
    const assignment = this.assignments.find(a => a.id === assignmentId)
    if (confirm(`Are you sure you want to delete "${assignment.title}"? This action cannot be undone.`)) {
      try {
        await TPEN.Project.delete(assignmentId)
        await this.loadAssignments()
        
        TPEN.eventDispatcher.dispatch('tpen-toast', {
          message: 'Assignment deleted successfully',
          type: 'success'
        })
      } catch (error) {
        TPEN.eventDispatcher.dispatch('tpen-toast', {
          message: `Failed to delete assignment: ${error.message}`,
          type: 'error'
        })
      }
    }
  }
}

customElements.define('tpen-assignment-manager', AssignmentManager)
```

### 3. Student Progress Tracking

```javascript
class StudentProgressTracker extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.currentClass = null
    this.students = []
    this.assignments = []
    this.progressData = new Map()
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    
    TPEN.eventDispatcher.on('tpen-project-loaded', async (project) => {
      if (project.type === 'classroom') {
        this.currentClass = project
        await this.loadProgressData()
      }
    })
    
    this.render()
  }
  
  async loadProgressData() {
    if (!this.currentClass) return
    
    try {
      const [students, assignments] = await Promise.all([
        this.loadStudents(),
        this.loadAssignments()
      ])
      
      // Load progress for each student
      for (const student of students) {
        const progress = await this.getStudentProgress(student.id)
        this.progressData.set(student.id, progress)
      }
      
      this.render()
    } catch (error) {
      console.error('Failed to load progress data:', error)
    }
  }
  
  async loadStudents() {
    const collaborators = await this.currentClass.getCollaborators()
    this.students = collaborators.filter(c => c.role === 'student')
    return this.students
  }
  
  async loadAssignments() {
    const assignments = await TPEN.Project.getByParent(this.currentClass.id)
    this.assignments = assignments.filter(a => a.type === 'assignment')
    return this.assignments
  }
  
  async getStudentProgress(studentId) {
    const progress = {
      totalAssignments: this.assignments.length,
      completedAssignments: 0,
      submittedAssignments: 0,
      gradedAssignments: 0,
      totalPoints: 0,
      earnedPoints: 0,
      assignments: []
    }
    
    for (const assignment of this.assignments) {
      try {
        const submission = await this.getStudentSubmission(assignment.id, studentId)
        const assignmentProgress = {
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.settings.dueDate,
          maxPoints: assignment.settings.maxPoints,
          submitted: !!submission,
          submittedAt: submission?.submittedAt,
          graded: !!submission?.grade,
          grade: submission?.grade,
          points: submission?.points || 0,
          status: this.getAssignmentStatus(assignment, submission)
        }
        
        progress.assignments.push(assignmentProgress)
        progress.totalPoints += assignment.settings.maxPoints
        
        if (submission) {
          progress.submittedAssignments++
          if (submission.grade) {
            progress.gradedAssignments++
            progress.earnedPoints += submission.points || 0
          }
        }
        
        if (assignmentProgress.status === 'completed') {
          progress.completedAssignments++
        }
        
      } catch (error) {
        console.error(`Failed to get submission for assignment ${assignment.id}:`, error)
      }
    }
    
    return progress
  }
  
  async getStudentSubmission(assignmentId, studentId) {
    try {
      const assignment = await TPEN.Project.load(assignmentId)
      const submissions = await assignment.getSubmissions()
      return submissions.find(s => s.studentId === studentId)
    } catch (error) {
      return null
    }
  }
  
  getAssignmentStatus(assignment, submission) {
    const dueDate = new Date(assignment.settings.dueDate)
    const now = new Date()
    
    if (submission?.grade) {
      return 'graded'
    } else if (submission) {
      return 'submitted'
    } else if (now > dueDate) {
      return 'overdue'
    } else {
      return 'pending'
    }
  }
  
  render() {
    if (!this.currentClass) {
      this.shadowRoot.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <p>Please select a class to view student progress.</p>
        </div>
      `
      return
    }
    
    this.shadowRoot.innerHTML = `
      <style>
        .progress-tracker {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .class-overview {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border: 1px solid #e0e0e0;
        }
        .overview-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .stat-item {
          background: white;
          padding: 1rem;
          border-radius: 4px;
          text-align: center;
        }
        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #007bff;
        }
        .stat-label {
          color: #666;
          font-size: 0.9rem;
        }
        .progress-table {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e0e0e0;
        }
        .table-header {
          background: #f8f9fa;
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
          font-weight: bold;
        }
        .student-row {
          border-bottom: 1px solid #f0f0f0;
        }
        .student-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          cursor: pointer;
          background: #fafafa;
        }
        .student-header:hover {
          background: #f0f0f0;
        }
        .student-name {
          font-weight: bold;
        }
        .student-stats {
          display: flex;
          gap: 2rem;
          font-size: 0.9rem;
        }
        .progress-bar {
          width: 100px;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #28a745;
          transition: width 0.3s ease;
        }
        .student-details {
          display: none;
          padding: 1rem;
          background: white;
        }
        .student-details.expanded {
          display: block;
        }
        .assignment-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }
        .assignment-card {
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 1rem;
        }
        .assignment-title {
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .assignment-status {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .status-completed { background: #d4edda; color: #155724; }
        .status-submitted { background: #cce5ff; color: #004085; }
        .status-graded { background: #d1ecf1; color: #0c5460; }
        .status-overdue { background: #f8d7da; color: #721c24; }
        .status-pending { background: #fff3cd; color: #856404; }
      </style>
      
      <div class="progress-tracker">
        <div class="class-overview">
          <h2>${this.currentClass.title} - Student Progress</h2>
          
          <div class="overview-stats">
            <div class="stat-item">
              <div class="stat-number">${this.students.length}</div>
              <div class="stat-label">Students</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${this.assignments.length}</div>
              <div class="stat-label">Assignments</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${this.calculateClassAverage()}%</div>
              <div class="stat-label">Class Average</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${this.calculateCompletionRate()}%</div>
              <div class="stat-label">Completion Rate</div>
            </div>
          </div>
        </div>
        
        <div class="progress-table">
          <div class="table-header">
            Student Progress Overview
          </div>
          
          ${this.students.map(student => {
            const progress = this.progressData.get(student.id) || {}
            const completionRate = progress.totalAssignments > 0 ? 
              Math.round((progress.completedAssignments / progress.totalAssignments) * 100) : 0
            const gradePercentage = progress.totalPoints > 0 ? 
              Math.round((progress.earnedPoints / progress.totalPoints) * 100) : 0
            
            return `
              <div class="student-row">
                <div class="student-header" onclick="this.parentElement.querySelector('.student-details').classList.toggle('expanded')">
                  <div class="student-name">${student.displayName || student.email}</div>
                  <div class="student-stats">
                    <div>
                      <span>Completion: ${completionRate}%</span>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${completionRate}%"></div>
                      </div>
                    </div>
                    <div>Grade: ${gradePercentage}%</div>
                    <div>Submitted: ${progress.submittedAssignments || 0}/${progress.totalAssignments || 0}</div>
                  </div>
                </div>
                
                <div class="student-details">
                  <div class="assignment-grid">
                    ${(progress.assignments || []).map(assignment => `
                      <div class="assignment-card">
                        <div class="assignment-title">${assignment.title}</div>
                        <div class="assignment-status status-${assignment.status}">
                          ${assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                        </div>
                        <div><strong>Due:</strong> ${new Date(assignment.dueDate).toLocaleDateString()}</div>
                        <div><strong>Points:</strong> ${assignment.points || 0}/${assignment.maxPoints}</div>
                        ${assignment.submittedAt ? `<div><strong>Submitted:</strong> ${new Date(assignment.submittedAt).toLocaleDateString()}</div>` : ''}
                        ${assignment.grade ? `<div><strong>Grade:</strong> ${assignment.grade}</div>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `
          }).join('')}
        </div>
      </div>
    `
  }
  
  calculateClassAverage() {
    if (this.students.length === 0) return 0
    
    let totalPercentage = 0
    let studentsWithGrades = 0
    
    for (const student of this.students) {
      const progress = this.progressData.get(student.id)
      if (progress && progress.totalPoints > 0) {
        const percentage = (progress.earnedPoints / progress.totalPoints) * 100
        totalPercentage += percentage
        studentsWithGrades++
      }
    }
    
    return studentsWithGrades > 0 ? Math.round(totalPercentage / studentsWithGrades) : 0
  }
  
  calculateCompletionRate() {
    if (this.students.length === 0 || this.assignments.length === 0) return 0
    
    let totalCompleted = 0
    let totalAssignments = this.students.length * this.assignments.length
    
    for (const student of this.students) {
      const progress = this.progressData.get(student.id)
      if (progress) {
        totalCompleted += progress.completedAssignments
      }
    }
    
    return Math.round((totalCompleted / totalAssignments) * 100)
  }
}

customElements.define('tpen-student-progress', StudentProgressTracker)
```

## Complete Classroom Management Example

Here's a complete example that combines all classroom management features:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>TPEN Classroom Management</title>
    <script src="https://app.t-pen.org/api/TPEN.js" type="module"></script>
    <script src="classroom-management.js" type="module"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        .tabs {
            display: flex;
            background: white;
            border-radius: 8px 8px 0 0;
            border: 1px solid #ddd;
            border-bottom: none;
        }
        .tab {
            padding: 1rem 2rem;
            cursor: pointer;
            border-right: 1px solid #ddd;
            background: #f8f9fa;
        }
        .tab.active {
            background: white;
            border-bottom: 1px solid white;
            margin-bottom: -1px;
        }
        .tab-content {
            background: white;
            border: 1px solid #ddd;
            border-radius: 0 0 8px 8px;
            min-height: 500px;
        }
        .tab-panel {
            display: none;
        }
        .tab-panel.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>TPEN Classroom Management</h1>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('classroom')">Class Setup</div>
            <div class="tab" onclick="showTab('assignments')">Assignments</div>
            <div class="tab" onclick="showTab('progress')">Student Progress</div>
        </div>
        
        <div class="tab-content">
            <div id="classroom" class="tab-panel active">
                <tpen-classroom-manager></tpen-classroom-manager>
            </div>
            
            <div id="assignments" class="tab-panel">
                <tpen-assignment-manager></tpen-assignment-manager>
            </div>
            
            <div id="progress" class="tab-panel">
                <tpen-student-progress></tpen-student-progress>
            </div>
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            // Hide all tab panels
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.remove('active')
            })
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active')
            })
            
            // Show selected tab panel
            document.getElementById(tabName).classList.add('active')
            
            // Mark selected tab as active
            event.target.classList.add('active')
        }
    </script>
</body>
</html>
```

## Key Educational Features

1. **Class Management**: Create and configure educational classes
2. **Student Enrollment**: Add students with appropriate roles and permissions
3. **Assignment Creation**: Create assignments with due dates and point values
4. **Progress Tracking**: Monitor student progress and completion rates
5. **Grade Management**: Handle grading and feedback workflows
6. **Role-Based Access**: Instructor, assistant, and student permission levels
7. **Submission Management**: Track and manage student submissions

## Related Recipes

* [User Authentication and Permissions](user-authentication-permissions.html)
* [Project Management Workflows](project-management-workflows.html)
* [Building a Complex Interface](building-a-complex-interface.html)
* [Transcription Interface Patterns](transcription-interface-patterns.html)