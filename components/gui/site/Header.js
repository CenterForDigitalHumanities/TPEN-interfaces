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
                    z-index: 15;
                    padding: 1em 1em 0 1em;
                    top: 0;
                    left: 0;
                    box-sizing: border-box;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
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
                button {
                    background-color: var(--primary-color);
                    color: var(--darkest);
                    border: none;
                    border-radius: .5em;
                    padding: .5em 1em;
                    cursor: pointer;
                    font-size: 1.2em;
                    }
                    button:hover {
                        background-color: var(--primary-light);
                    color: var(--darkest);
                }
                </style>
            <header>
                <nav>
                    <ul>
                        <li><a href="/home">Home</a></li>
                        <li><a href="#">About</a></li>
                        <li><tpen-action-link data-description="Whatever the TPEN.actionLink is will be a button-looking link here."><button type=button>Action</button></tpen-action-link></li>
                    </ul>
                </nav>
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
            </header>
        `;
    }
}

customElements.define('tpen-header', TpenHeader);
