import { Roles } from './groups/roles.mjs';

const userRoles = localStorage.getItem('userRole');

export function updateUIBasedOnRoles(roles) {
    const managementOptions = document.getElementById('managementOptions');
    const viewOptions = document.getElementById('viewOptions');

    // If the user doesn't have a role
    if (!roles || roles.length === 0) {
        managementOptions.style.display = 'none';
        viewOptions.style.display = 'none';
        return;
    }

    // Show management/view options for OWNER and LEADER
    if (roles.includes(Roles.OWNER) || roles.includes(Roles.LEADER)) {
        managementOptions.style.display = 'block';
    } else {
        managementOptions.style.display = 'none';
    }

    // Show view options for CONTRIBUTORS
    if (roles.includes(Roles.CONTRIBUTOR)) {
        viewOptions.style.display = 'block';
    } else {
        viewOptions.style.display = 'none';
    }
}

updateUIBasedOnRoles(userRoles);