import {decodeContentState} from '../iiif-tools/index.js'
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'
import vault from '../../js/vault.js'

const LINE_TEXT_HTML = `<span>
    <span style="border-radius: 1em; background-color: lightgrey; width: 100%; min-width:14em;min-height: 1em; display: inline-block;">
    </span>
</span>`

/**
 * TpenLineText - Displays the text content from a TPEN line annotation.
 * @element tpen-line-text
 */
class TpenLineText extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-line-id', 'iiif-content']
    }

    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === 'tpen-line-id') {
                if(newValue!==this.line?.id)
                    this.loadText(newValue)
            } else if (name === 'iiif-content') {
                this.loadContent(newValue)
            }
        }
    }

    #id = () => this.closest('[tpen-line-id]')?.getAttribute('tpen-line-id')
    #content = () => this.closest('[iiif-content]')?.getAttribute('iiif-content')

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = LINE_TEXT_HTML
    }

    connectedCallback() {
        const setLineHandler = e => {
            this.line = e.detail
            this.drawLineText()
        }
        this.addEventListener('tpen-set-line', setLineHandler)
        this.cleanup.add(() => this.removeEventListener('tpen-set-line', setLineHandler))

        const SPAN = this.shadowRoot.querySelector('span')

        if (!this.#id() && !this.#content()) {
            this.validateContent(null,SPAN,"Line ID is required")
        }
        if(this.line) {
            this.setAttribute('tpen-line-id',this.line.id)
            if(Object.keys(this.line).length > 4) this.drawLineText()
            return
        }
        this.#content() ? this.loadContent(this.#content(),SPAN) : this.loadText(this.#id(),SPAN)
    }

    disconnectedCallback() {
        this.cleanup.run()
    }

    drawLineText() {
        const SPAN = this.shadowRoot.querySelector('span')
        const innerText = this.validateContent(this.getText(this.line))
        SPAN.innerText = innerText
    }

    async loadText(lineId){
        if(!lineId) return
        try {
            new URL(lineId)
            this.line = await this.#loadAnnotation(lineId)
            this.drawLineText()
        } catch (error) {
            console.error(error)
            return this.validateContent(null,"Fetching Error")
        }
    }
    
    loadContent(b64){
        try {
            this.line = JSON.parse(decodeContentState(b64))
            this.drawLineText()
        } catch (error) {
            console.error(error)
            return this.validateContent(null,"Decoding Error")
        }
    }
    
    async #loadAnnotation(url){
        try {
            return await vault.get(url, 'annotation', false, 'tpen-line-text')
        } catch (error) {
            console.error(error)
        }
    }
    /**
     * Extract the text only content from an Annotation or body
     * @param {any} textBody String, Array, or Object with text content
     * @returns String with text content, flattened from nested objects
     */
    getText(textBody){
        if(typeof textBody === "string") {
            return textBody
        }
        if(Array.isArray(textBody)){
            return textBody.map(t=>this.getText(t)).join(' ')
        }
        let meaningfulProp = textBody.value ?? textBody.body ?? textBody["cnt:chars"] ?? textBody.bodyValue 
        ?? textBody.chars ?? textBody.text ?? textBody.resource
        // possible language mapping
        ?? textBody[navigator.language] ?? textBody[navigator.language.split('-')[0]] ?? textBody.none
        if(meaningfulProp) return this.getText(meaningfulProp)
        // maybe this is a nested object, specific language, etc.
        console.warn("Unrecognized text body",textBody)
        return "<>" // this will always look broken
    }
    
    validateContent(content,msg='Invalid content') {
        if(content==null){
            this.setAttribute('aria-invalid',true)
            this.setAttribute('title', msg)
        }
        return content
    }
}

customElements.define('tpen-line-text', TpenLineText)

export default {
    TpenLineText
}
