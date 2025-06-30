document.querySelectorAll('.collapse-button').forEach(button => {
    button.addEventListener('click', () => {
        const panel = button.closest('.new-project-panel').querySelector('.carousel-container') || button.closest('.new-project-panel').querySelector('.grid-container')
        console.log(panel)
        if (panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed')
            button.textContent = 'Collapse Details'
        } else {
            panel.classList.add('collapsed')
            button.textContent = 'Expand Details'
        }
    })
})

document.querySelectorAll(".carousel-track").forEach((track, index) => {
    const cards = track.querySelectorAll(".new-project-card")
    const prevBtn = document.getElementById(`prevBtn${index}`)
    const nextBtn = document.getElementById(`nextBtn${index}`)
    let currentIndex = 0
    
    track.style.transition = 'transform 0.4s ease-in-out'
    
    function updateCarousel() {
        const cardStyle = getComputedStyle(cards[0])
        const cardWidth = cards[0].offsetWidth
        const marginRight = parseInt(cardStyle.marginRight || 0)
        const totalWidth = cardWidth + marginRight
        track.style.transform = `translateX(-${currentIndex * totalWidth}px)`
        prevBtn.disabled = currentIndex === 0
        nextBtn.disabled = currentIndex === cards.length - Math.ceil(track.offsetWidth / totalWidth)
    }
    
    prevBtn.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--
            updateCarousel()
        }
    })
    
    nextBtn.addEventListener("click", () => {
        if (currentIndex < cards.length - Math.ceil(track.offsetWidth / (cards[0].offsetWidth + parseInt(getComputedStyle(cards[0]).marginRight)))) {
            currentIndex++
            updateCarousel()
        }
    })

    window.addEventListener("resize", updateCarousel)
    updateCarousel()
})

document.querySelectorAll('.done-checkbox input').forEach(checkbox => {
  checkbox.addEventListener('change', (e) => {
    const gridItem = e.target.closest('.grid-item')
    if (e.target.checked) {
      gridItem.classList.add('done')
    } else {
      gridItem.classList.remove('done')
    }
  })
})

document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'))
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))
        tab.classList.add('active')
        document.getElementById(tab.dataset.tab).classList.add('active')
    })
})