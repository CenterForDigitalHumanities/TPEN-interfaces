import TPEN from "../../../api/TPEN.js"
class TpenHeader extends HTMLElement {

    constructor() {
        super();
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
        this.setupDraggableButton()
    }

    setupDraggableButton() {
        const btn = this.shadowRoot.querySelector('.action-button')
        let isDragging = false
        let startX = 0
        let currentX = 0
        let hasMoved = false
        let dragStartTime = 0
        let lastX = 0
        let lastTime = 0
        let velocityX = 0
        let animationFrame = null
        let initialRect = null // Store initial position
        const DRAG_THRESHOLD = 5 // pixels
        const TIME_THRESHOLD = 200 // milliseconds
        const FRICTION = 0.92 // Deceleration factor
        const MIN_VELOCITY = 0.5 // Stop animation below this velocity
        const BOUNCE_DAMPING = 0.4 // How much velocity is retained after bounce

        const getBounds = () => {
            if (!initialRect) {
                // Store the button's initial position on first call
                btn.style.position = 'relative'
                btn.style.left = '0px'
                initialRect = btn.getBoundingClientRect()
            }
            
            const header = this.shadowRoot.querySelector('header')
            const headerRect = header.getBoundingClientRect()
            const btnWidth = initialRect.width
            
            // Calculate bounds relative to initial position
            const maxLeft = headerRect.right - initialRect.right - 20 // Space to right edge
            const maxRight = headerRect.left - initialRect.left + 20 // Space to left edge
            
            return { maxLeft, maxRight }
        }

        const animate = () => {
            if (Math.abs(velocityX) > MIN_VELOCITY) {
                currentX += velocityX
                velocityX *= FRICTION
                
                // Check boundaries and bounce
                const bounds = getBounds()
                if (currentX > bounds.maxLeft) {
                    currentX = bounds.maxLeft
                    velocityX = -Math.abs(velocityX) * BOUNCE_DAMPING // Bounce back with damping
                } else if (currentX < bounds.maxRight) {
                    currentX = bounds.maxRight
                    velocityX = Math.abs(velocityX) * BOUNCE_DAMPING // Bounce back with damping
                }
                
                btn.style.left = `${currentX}px`
                animationFrame = requestAnimationFrame(animate)
            } else {
                animationFrame = null
            }
        }

        const onPointerDown = (e) => {
            // Cancel any ongoing momentum animation
            if (animationFrame) {
                cancelAnimationFrame(animationFrame)
                animationFrame = null
            }
            
            isDragging = true
            hasMoved = false
            dragStartTime = Date.now()
            lastTime = Date.now()
            startX = e.clientX - currentX
            lastX = e.clientX
            velocityX = 0
            btn.style.cursor = 'grabbing'
            btn.setPointerCapture(e.pointerId)
            btn.style.transition = 'none'
            e.preventDefault()
        }

        const onPointerMove = (e) => {
            if (!isDragging) return
            
            const now = Date.now()
            const deltaTime = now - lastTime
            const deltaX = e.clientX - startX
            
            if (Math.abs(deltaX - currentX) > DRAG_THRESHOLD) {
                hasMoved = true
            }
            
            // Calculate velocity for momentum
            if (deltaTime > 0) {
                velocityX = (e.clientX - lastX) / deltaTime * 16 // Normalize to ~60fps
            }
            
            // Constrain to viewport bounds while dragging
            const bounds = getBounds()
            currentX = Math.max(bounds.maxRight, Math.min(bounds.maxLeft, deltaX))
            
            lastX = e.clientX
            lastTime = now
            btn.style.position = 'relative'
            btn.style.left = `${currentX}px`
        }

        const onPointerUp = (e) => {
            if (!isDragging) return
            
            isDragging = false
            btn.style.cursor = 'grab'
            btn.releasePointerCapture(e.pointerId)
            
            const dragDuration = Date.now() - dragStartTime
            
            // If the button was dragged significantly (distance or time), prevent the click
            if (hasMoved || dragDuration > TIME_THRESHOLD) {
                e.preventDefault()
                e.stopPropagation()
            }
            
            // Apply momentum if there's velocity
            if (Math.abs(velocityX) > MIN_VELOCITY && hasMoved) {
                animationFrame = requestAnimationFrame(animate)
            }
        }

        // Prevent click if drag occurred
        btn.addEventListener('click', (e) => {
            if (hasMoved) {
                e.preventDefault()
                e.stopPropagation()
            }
        }, true)

        btn.addEventListener('pointerdown', onPointerDown)
        btn.addEventListener('pointermove', onPointerMove)
        btn.addEventListener('pointerup', onPointerUp)
        btn.addEventListener('pointercancel', onPointerUp)
        btn.style.cursor = 'grab'
        btn.style.touchAction = 'none'
    }
}

customElements.define('tpen-header', TpenHeader);
