export default function renderRoles(roles) {
    const defaultRoles = ["OWNER", "LEADER", "CONTRIBUTOR", "VIEWER"]

    return roles
        .map(role => {
            if (role === "OWNER") {
                return `<span class="role owner">Owner</span>`
            } else if (role === "LEADER") {
                return `<span class="role leader">Leader</span>`
            } else if (defaultRoles.includes(role)) {
                return `<span class="role default">${role.toLowerCase()}</span>`
            } else {
                return `<span class="role custom">${role.toLowerCase().replaceAll("_", " ")}</span>`
            }
        })
        .join(", ")
}
