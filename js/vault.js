import { Vault } from 'https://unpkg.com/@iiif/helpers@1.3.2/dist/vault.js'

// Create a single instance to be shared across the application
const vault = new Vault()

export default vault
