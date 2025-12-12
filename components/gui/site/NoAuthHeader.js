class NoAuthHeader extends HTMLElement {

    constructor() {
        super()
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="../../components/gui/site/header.css">
            <header>
                <h1 style="margin: 0;">
                    <span>tpen</span>
                    <div class="cube">
                        <div class="top"></div>
                        <div class="right"></div>
                        <div class="bottom"></div>
                        <div class="left"></div>
                        <div class="front"></div>
                        <div class="back"></div>
                    </div>
                    <div class="cube">
                        <div class="top"></div>
                        <div class="right"></div>
                        <div class="bottom"></div>
                        <div class="left"></div>
                        <div class="front"></div>
                        <div class="back"></div>
                    </div>
                    <div class="cube">
                        <div class="top"></div>
                        <div class="right"></div>
                        <div class="bottom"></div>
                        <div class="left"></div>
                        <div class="front"></div>
                        <div class="back"></div>
                    </div>
                </h1>
                <h1 class="banner ${this.getAttribute('title') ? "" : "hidden"}">${this.getAttribute('title') ?? ""}</h1>
                <tpen-action-link data-description="Whatever the TPEN.actionLink is will be a button-looking link here.">
                    <button type="button" class="action-button hidden">Action</button>
                </tpen-action-link>
            </header>
        `
    }
}

customElements.define('tpen-no-auth-header', NoAuthHeader)