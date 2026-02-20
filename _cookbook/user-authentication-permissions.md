---
title: User Authentication and Permissions
description: Implementing secure authentication and permission-based access control with user profiles and role management.
author: <cubap@slu.edu>
layout: recipe
tags: [tpen, authentication, permissions, security, users]
---

## Use Case

You need to implement user authentication in your TPEN interface and control access to features based on user roles and permissions. This includes handling login/logout, managing user profiles, and implementing role-based access control.

## Implementation Notes

TPEN uses OAuth-based authentication with t-pen.org, and permissions are managed through roles assigned to users within projects. This recipe shows how to implement comprehensive authentication and permission handling.

## Basic Authentication Setup

### 1. Simple Login/Logout

```javascript
import { TPEN } from 'https://app.t-pen.org/api/TPEN.js'

class AuthComponent extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }
  
  connectedCallback() {
    // Attach authentication to this element
    TPEN.attachAuthentication(this)
    
    // Listen for auth events
    TPEN.eventDispatcher.on('tpen-user-authenticated', (user) => {
      this.handleUserLogin(user)
    })
    
    this.render()
  }
  
  handleUserLogin(user) {
    console.log('User logged in:', user)
    this.updateAuthStatus(true)
    this.loadUserProfile(user)
  }
  
  async logout() {
    await TPEN.logout()
    this.updateAuthStatus(false)
    
    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('user-logged-out'))
  }
  
  updateAuthStatus(isAuthenticated) {
    this.render()
  }
  
  render() {
    const user = TPEN.currentUser
    
    this.shadowRoot.innerHTML = `
      <style>
        .auth-container {
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .logout-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 3px;
          cursor: pointer;
        }
      </style>
      
      <div class="auth-container">
        ${user ? `
          <div class="user-info">
            <span>Welcome, ${user.displayName || user.email}</span>
            <button class="logout-btn" onclick="this.getRootNode().host.logout()">
              Logout
            </button>
          </div>
        ` : `
          <p>Please log in to access TPEN features.</p>
        `}
      </div>
    `
  }
}

customElements.define('tpen-auth', AuthComponent)
```

### 2. User Profile Management

```javascript
class UserProfileManager extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.userProfile = null
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    
    TPEN.eventDispatcher.on('tpen-user-authenticated', async (user) => {
      await this.loadUserProfile(user)
    })
    
    this.render()
  }
  
  async loadUserProfile(user) {
    try {
      // Load complete user profile
      this.userProfile = await user.getProfile()
      this.render()
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }
  
  async updateProfile(profileData) {
    try {
      await TPEN.currentUser.updateProfile(profileData)
      
      // Refresh profile data
      await this.loadUserProfile(TPEN.currentUser)
      
      this.dispatchEvent(new CustomEvent('profile-updated', {
        detail: { profile: this.userProfile }
      }))
      
      // Show success message
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Profile updated successfully',
        type: 'success'
      })
    } catch (error) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: `Failed to update profile: ${error.message}`,
        type: 'error'
      })
    }
  }
  
  render() {
    const user = TPEN.currentUser
    const profile = this.userProfile
    
    this.shadowRoot.innerHTML = `
      <style>
        .profile-container {
          max-width: 400px;
          margin: 0 auto;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.25rem;
          font-weight: bold;
        }
        .form-group input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 3px;
        }
        .save-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 3px;
          cursor: pointer;
        }
      </style>
      
      <div class="profile-container">
        ${!user ? '<p>Please log in to view your profile.</p>' : `
          <h3>User Profile</h3>
          <form id="profileForm">
            <div class="form-group">
              <label for="displayName">Display Name</label>
              <input 
                type="text" 
                id="displayName" 
                value="${profile?.displayName || ''}"
                placeholder="Enter your display name"
              />
            </div>
            
            <div class="form-group">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email" 
                value="${profile?.email || user.email || ''}"
                readonly
              />
            </div>
            
            <div class="form-group">
              <label for="bio">Bio</label>
              <input 
                type="text" 
                id="bio" 
                value="${profile?.bio || ''}"
                placeholder="Tell us about yourself"
              />
            </div>
            
            <button type="submit" class="save-btn">Save Profile</button>
          </form>
        `}
      </div>
    `
    
    // Add form submit handler
    if (user) {
      const form = this.shadowRoot.querySelector('#profileForm')
      form.addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleProfileSubmit(e)
      })
    }
  }
  
  handleProfileSubmit(event) {
    const formData = new FormData(event.target)
    const profileData = {
      displayName: formData.get('displayName'),
      bio: formData.get('bio')
    }
    
    this.updateProfile(profileData)
  }
}

customElements.define('tpen-profile-manager', UserProfileManager)
```

## Permission-Based Access Control

### 3. Role and Permission Management

```javascript
class PermissionManager {
  constructor() {
    this.permissions = new Map()
    this.roles = new Map()
  }
  
  // Define available permissions
  static PERMISSIONS = {
    CREATE_PROJECT: 'create-project',
    MANAGE_USERS: 'manage-users',
    MODIFY_TRANSCRIPTIONS: 'modify-transcriptions',
    VIEW_ALL_PROJECTS: 'view-all-projects',
    EXPORT_DATA: 'export-data',
    MANAGE_ROLES: 'manage-roles'
  }
  
  // Define default roles
  static ROLES = {
    ADMIN: 'admin',
    INSTRUCTOR: 'instructor',
    STUDENT: 'student',
    VIEWER: 'viewer'
  }
  
  // Initialize default role permissions
  initializeDefaults() {
    const { PERMISSIONS, ROLES } = PermissionManager
    
    // Admin has all permissions
    this.setRolePermissions(ROLES.ADMIN, Object.values(PERMISSIONS))
    
    // Instructor permissions
    this.setRolePermissions(ROLES.INSTRUCTOR, [
      PERMISSIONS.CREATE_PROJECT,
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.MODIFY_TRANSCRIPTIONS,
      PERMISSIONS.VIEW_ALL_PROJECTS,
      PERMISSIONS.EXPORT_DATA
    ])
    
    // Student permissions
    this.setRolePermissions(ROLES.STUDENT, [
      PERMISSIONS.MODIFY_TRANSCRIPTIONS
    ])
    
    // Viewer permissions
    this.setRolePermissions(ROLES.VIEWER, [])
  }
  
  setRolePermissions(role, permissions) {
    this.roles.set(role, new Set(permissions))
  }
  
  hasPermission(userRole, permission) {
    const rolePermissions = this.roles.get(userRole)
    return rolePermissions ? rolePermissions.has(permission) : false
  }
  
  async checkUserPermission(permission) {
    if (!TPEN.currentUser) return false
    
    try {
      const userRole = await this.getUserRole()
      return this.hasPermission(userRole, permission)
    } catch (error) {
      console.error('Permission check failed:', error)
      return false
    }
  }
  
  async getUserRole() {
    // This would typically query the API for user's role
    // For now, return a default role
    return TPEN.currentUser.role || PermissionManager.ROLES.STUDENT
  }
}

// Global permission manager instance
const permissionManager = new PermissionManager()
permissionManager.initializeDefaults()
```

### 4. Permission-Based UI Components

```javascript
class PermissionBasedUI extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.permissions = {
      canCreateProject: false,
      canManageUsers: false,
      canModifyTranscriptions: false,
      canViewAllProjects: false,
      canExportData: false
    }
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    
    TPEN.eventDispatcher.on('tpen-user-authenticated', async () => {
      await this.loadUserPermissions()
    })
    
    this.render()
  }
  
  async loadUserPermissions() {
    const { PERMISSIONS } = PermissionManager
    
    try {
      this.permissions = {
        canCreateProject: await permissionManager.checkUserPermission(PERMISSIONS.CREATE_PROJECT),
        canManageUsers: await permissionManager.checkUserPermission(PERMISSIONS.MANAGE_USERS),
        canModifyTranscriptions: await permissionManager.checkUserPermission(PERMISSIONS.MODIFY_TRANSCRIPTIONS),
        canViewAllProjects: await permissionManager.checkUserPermission(PERMISSIONS.VIEW_ALL_PROJECTS),
        canExportData: await permissionManager.checkUserPermission(PERMISSIONS.EXPORT_DATA)
      }
      
      this.render()
    } catch (error) {
      console.error('Failed to load permissions:', error)
    }
  }
  
  render() {
    const user = TPEN.currentUser
    const { permissions } = this
    
    this.shadowRoot.innerHTML = `
      <style>
        .permission-container {
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .permission-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }
        .permission-item:last-child {
          border-bottom: none;
        }
        .permission-status {
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.8rem;
        }
        .permission-granted {
          background: #d4edda;
          color: #155724;
        }
        .permission-denied {
          background: #f8d7da;
          color: #721c24;
        }
        .action-buttons {
          margin-top: 1rem;
        }
        .action-buttons button {
          margin: 0.25rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 3px;
          cursor: pointer;
        }
        .action-buttons button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .create-btn { background: #007bff; color: white; }
        .manage-btn { background: #28a745; color: white; }
        .export-btn { background: #ffc107; color: black; }
      </style>
      
      <div class="permission-container">
        ${!user ? '<p>Please log in to view permissions.</p>' : `
          <h3>Your Permissions</h3>
          
          <div class="permission-item">
            <span>Create Projects</span>
            <span class="permission-status ${permissions.canCreateProject ? 'permission-granted' : 'permission-denied'}">
              ${permissions.canCreateProject ? 'Granted' : 'Denied'}
            </span>
          </div>
          
          <div class="permission-item">
            <span>Manage Users</span>
            <span class="permission-status ${permissions.canManageUsers ? 'permission-granted' : 'permission-denied'}">
              ${permissions.canManageUsers ? 'Granted' : 'Denied'}
            </span>
          </div>
          
          <div class="permission-item">
            <span>Modify Transcriptions</span>
            <span class="permission-status ${permissions.canModifyTranscriptions ? 'permission-granted' : 'permission-denied'}">
              ${permissions.canModifyTranscriptions ? 'Granted' : 'Denied'}
            </span>
          </div>
          
          <div class="permission-item">
            <span>View All Projects</span>
            <span class="permission-status ${permissions.canViewAllProjects ? 'permission-granted' : 'permission-denied'}">
              ${permissions.canViewAllProjects ? 'Granted' : 'Denied'}
            </span>
          </div>
          
          <div class="permission-item">
            <span>Export Data</span>
            <span class="permission-status ${permissions.canExportData ? 'permission-granted' : 'permission-denied'}">
              ${permissions.canExportData ? 'Granted' : 'Denied'}
            </span>
          </div>
          
          <div class="action-buttons">
            <button 
              class="create-btn" 
              ${!permissions.canCreateProject ? 'disabled' : ''}
              onclick="this.getRootNode().host.createProject()"
            >
              Create New Project
            </button>
            
            <button 
              class="manage-btn" 
              ${!permissions.canManageUsers ? 'disabled' : ''}
              onclick="this.getRootNode().host.manageUsers()"
            >
              Manage Users
            </button>
            
            <button 
              class="export-btn" 
              ${!permissions.canExportData ? 'disabled' : ''}
              onclick="this.getRootNode().host.exportData()"
            >
              Export Data
            </button>
          </div>
        `}
      </div>
    `
  }
  
  createProject() {
    if (!this.permissions.canCreateProject) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Permission denied: Cannot create projects',
        type: 'error'
      })
      return
    }
    
    // Implement project creation logic
    console.log('Creating new project...')
  }
  
  manageUsers() {
    if (!this.permissions.canManageUsers) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Permission denied: Cannot manage users',
        type: 'error'
      })
      return
    }
    
    // Implement user management logic
    console.log('Opening user management...')
  }
  
  exportData() {
    if (!this.permissions.canExportData) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Permission denied: Cannot export data',
        type: 'error'
      })
      return
    }
    
    // Implement data export logic
    console.log('Exporting data...')
  }
}

customElements.define('tpen-permission-ui', PermissionBasedUI)
```

## Remote Authentication (Single Sign-On)

### 5. Remote Login Integration

```javascript
class RemoteAuth extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.authConfig = {
      returnUrl: window.location.href,
      provider: 'tpen',
      scopes: ['read', 'write']
    }
  }
  
  connectedCallback() {
    this.checkForAuthCallback()
    this.render()
  }
  
  checkForAuthCallback() {
    // Check URL for auth callback parameters
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const error = urlParams.get('error')
    
    if (token) {
      this.handleAuthCallback(token)
    } else if (error) {
      this.handleAuthError(error)
    }
  }
  
  async handleAuthCallback(token) {
    try {
      // Validate and process the token
      const user = await this.validateAuthToken(token)
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      
      // Dispatch successful authentication
      TPEN.eventDispatcher.dispatch('tpen-user-authenticated', user)
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Successfully authenticated via remote login',
        type: 'success'
      })
    } catch (error) {
      this.handleAuthError(error.message)
    }
  }
  
  async validateAuthToken(token) {
    // Validate token with TPEN API
    const response = await fetch('https://api.t-pen.org/auth/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Token validation failed')
    }
    
    return await response.json()
  }
  
  handleAuthError(error) {
    console.error('Authentication error:', error)
    TPEN.eventDispatcher.dispatch('tpen-toast', {
      message: `Authentication failed: ${error}`,
      type: 'error'
    })
  }
  
  initiateRemoteLogin() {
    const authUrl = this.buildAuthUrl()
    window.location.href = authUrl
  }
  
  buildAuthUrl() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'tpen-interface',
      redirect_uri: this.authConfig.returnUrl,
      scope: this.authConfig.scopes.join(' ')
    })
    
    return `https://auth.t-pen.org/oauth/authorize?${params.toString()}`
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .remote-auth {
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          text-align: center;
        }
        .remote-login-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 3px;
          cursor: pointer;
          font-size: 1rem;
        }
        .remote-login-btn:hover {
          background: #0056b3;
        }
      </style>
      
      <div class="remote-auth">
        <h3>Remote Authentication</h3>
        <p>Login using your institutional credentials</p>
        <button 
          class="remote-login-btn" 
          onclick="this.getRootNode().host.initiateRemoteLogin()"
        >
          Login with Single Sign-On
        </button>
      </div>
    `
  }
}

customElements.define('tpen-remote-auth', RemoteAuth)
```

## Complete Example

Here's a complete example that demonstrates all authentication and permission concepts:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>TPEN Authentication Example</title>
    <script src="https://app.t-pen.org/api/TPEN.js" type="module"></script>
    <script src="auth-example.js" type="module"></script>
</head>
<body>
    <h1>TPEN Authentication & Permissions Demo</h1>
    
    <section>
        <h2>Authentication</h2>
        <tpen-auth></tpen-auth>
    </section>
    
    <section>
        <h2>User Profile</h2>
        <tpen-profile-manager></tpen-profile-manager>
    </section>
    
    <section>
        <h2>Permissions</h2>
        <tpen-permission-ui></tpen-permission-ui>
    </section>
    
    <section>
        <h2>Remote Authentication</h2>
        <tpen-remote-auth></tpen-remote-auth>
    </section>
</body>
</html>
```

## Security Considerations

1. **Token Storage**: Never store authentication tokens in localStorage or sessionStorage
2. **Permission Validation**: Always validate permissions on the server side
3. **HTTPS Only**: Ensure all authentication flows use HTTPS
4. **Token Expiration**: Handle token expiration gracefully
5. **CSRF Protection**: Implement CSRF protection for sensitive operations

## Related Recipes

* [Building a Simple Interface](building-a-simple-interface.html)
* [Project Management Workflows](project-management-workflows.html)
* [Building a Complex Interface](building-a-complex-interface.html)