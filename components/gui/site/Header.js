import TPEN from "../../../api/TPEN.js"
class TpenHeader extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                header {
                    position: fixed;
                    background-color: var(--darkest);
                    width: 100%;
                    height: 4em;
                    z-index: 15;
                    padding: 1em 1em 0 1em;
                    top: 0;
                    left: 0;
                    box-sizing: border-box;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                h1 {
                    white-space: nowrap;
                }
                .cube {
                    transform-style: preserve-3d;
                    animation: spin linear reverse;
                    animation-timeline: scroll();
                    position: relative;
                    width: 20px;
                    height: 20px;
                    display: inline-block;
                    margin: 0 5px;
                }
                .cube + .cube {
                    animation-direction: normal;
                    animation-iteration-count: 2;
                }
                .cube + .cube + .cube {
                    animation-direction: reverse;
                    animation-iteration-count: .62;
                }
                .cube div {
                    width: 20px;
                    height: 20px;
                    line-height: 20px;
                    text-align: center;
                    box-shadow: inset 0px 0px 0px 1px var(--darkest);
                    background: var(--primary-color);
                    display: block;
                    position: absolute;
                }
                .cube div.top {
                    transform: rotateX(90deg);
                    margin-top: -10px;
                }
                .cube div.right {
                    transform: rotateY(90deg);
                    margin-left: 10px;
                }
                .cube div.bottom {
                    transform: rotateX(-90deg);
                    margin-top: 10px;
                }
                .cube div.left {
                    transform: rotateY(-90deg);
                    margin-left: -10px;
                }
                .cube div.front {
                    transform: translateZ(10px);
                }
                .cube div.back {
                    transform: translateZ(-10px) rotateX(180deg);
                }
                h1 > span {
                    color: var(--primary-color);
                    text-transform: uppercase;
                }
                @keyframes spin {
                    0% {
                        transform: rotateX(157deg) rotateY(280deg) rotateZ(330deg);
                    }
                    100% {
                        transform: rotateX(0deg) rotateY(740deg) rotateZ(900deg);
                    }
                }
                nav {
                    display: flex;
                    justify-content: space-between;
                }
                ul {
                    list-style: none;
                    display: flex;
                    align-items: center;
                }
                li {
                    margin-right: 1em;
                }
                a {
                    color: var(--primary-light);
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
                .action-button {
                    background-color: var(--primary-color);
                    color: var(--white);
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 1.2em;
                    box-shadow: rgba(0, 0, 0, .5) 0 0 .25em;
                    position: relative;
                    bottom: -1.25em;
                    opacity: 1;
                    visibility: visible;
                    aspect-ratio: 1 / 1;
                    max-width: 15vw;
                    outline: var(--primary-light) 1px solid;
                    outline-offset: -3.5px;
                    transition: all .3s;
                }
                .action-button:focus, .action-button:hover {
                    outline: var(--primary-color) 1px solid;
                    outline-offset: -1.5px;
                }
                .hidden {
                    visibility: hidden;
                    opacity: 0;
                    pointer-events: none;
                }
                button:hover {
                    background-color: var(--primary-light);
                    color: var(--darkest);
                }
                h1.banner {
                    background-color: var(--white);
                    color: var(--accent);
                    border-radius: .125em;
                    text-align: center;
                    padding: .125em;
                    margin: -.125em;
                    position: relative;
                    bottom: .25em;
                    font-size: clamp(1rem, 5vw, 2rem);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            </style>
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
                <nav>
                    <ul>
                        <li><a href="/index">Home</a></li>
                        <li><a href="/about">About</a></li>
                        <li class="logout-btn"><a href="#">Logout</a></li>
                    </ul>
                </nav>
            </header>
        `;
    }
    connectedCallback() {
        TPEN.eventDispatcher.on('tpen-gui-title', ev => {
            if(!ev.detail) {
                title.classList.add('hidden')
                return
            }
            const title = this.shadowRoot.querySelector('.banner')
            title.classList.remove('hidden')
            title.textContent = ev.detail
            title.setAttribute('title', ev.detail)
        })
        TPEN.eventDispatcher.on('tpen-gui-action-link', ev => {
            const btn = this.shadowRoot.querySelector('.action-button')
            btn.classList.remove('hidden')
            btn.textContent = ev.detail.label
            btn.addEventListener('click', ev.detail.callback)
        })
        TPEN.eventDispatcher.on('tpen-gui-action-link-remove', ev => {
            const btn = this.shadowRoot.querySelector('.action-button')
            btn.classList.add('hidden')
            btn.removeEventListener('click', ev.detail.callback)
        })
        this.shadowRoot.querySelector('.logout-btn').addEventListener('click', ()=>TPEN.logout())
    }
}

customElements.define('tpen-header', TpenHeader);
