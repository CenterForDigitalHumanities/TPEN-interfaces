export default function renderRoles(roles) {
    if (roles.includes("OWNER")) {
        return "owner"
    } else if (roles.includes("LEADER")) {
        return "leader"
    } else {
        return roles.join(", ").toLowerCase().replaceAll("_", " ")
    }
}