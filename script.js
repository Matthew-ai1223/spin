;(function(){
	const bottle = document.getElementById('bottle')
	const spinBtn = document.getElementById('spinBtn')
	const soundToggle = document.getElementById('soundToggle')
	const playerInput = document.getElementById('playerInput')
	const addPlayerBtn = document.getElementById('addPlayerBtn')
	const playersList = document.getElementById('playersList')
	const playersHint = document.getElementById('playersHint')
	const wheel = document.getElementById('wheel')
	const wheelLabels = document.getElementById('wheelLabels')
	const winnerEl = document.getElementById('winner')
	const rim = document.getElementById('rim')

	let isSpinning = false
	let currentRotation = 0
	let spinAudio
	let players = []
	let lastTickIndex = null

	function ensureAudio(){
		if(spinAudio) return spinAudio
		const context = new (window.AudioContext||window.webkitAudioContext)()
		const gain = context.createGain()
		gain.gain.value = 0.08
		gain.connect(context.destination)
		spinAudio = {
			context,
			gain,
			play(){
				if(!soundToggle.checked) return
				const o = context.createOscillator()
				o.type = 'triangle'
				o.frequency.setValueAtTime(220, context.currentTime)
				o.frequency.exponentialRampToValueAtTime(40, context.currentTime + 1.2)
				o.connect(gain)
				o.start()
				o.stop(context.currentTime + 1.25)
			},
			tick(){
				if(!soundToggle.checked) return
				const o = context.createOscillator()
				const g = context.createGain()
				o.type = 'square'
				o.frequency.setValueAtTime(1200, context.currentTime)
				g.gain.setValueAtTime(0.0001, context.currentTime)
				g.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.002)
				g.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.05)
				o.connect(g)
				g.connect(gain)
				o.start()
				o.stop(context.currentTime + 0.06)
			}
		}
		return spinAudio
	}

	function setSpinning(spinning){
		isSpinning = spinning
		document.body.classList.toggle('spinning', spinning)
		spinBtn.textContent = spinning ? 'Spinning…' : 'Spin'
		updateControls()
	}

	function randomBetween(min, max){
		return Math.random() * (max - min) + min
	}

	function easingOutCubic(t){
		return 1 - Math.pow(1 - t, 3)
	}

	function spin(){
		if(isSpinning) return
		if(players.length < 2) return
		setSpinning(true)

		const extraTurns = Math.floor(randomBetween(3, 7))
		const finalAngle = randomBetween(0, 360)
		const targetRotation = currentRotation + extraTurns * 360 + finalAngle
		const durationMs = randomBetween(1400, 2200)

		ensureAudio().play()

		const start = performance.now()
		const startRotation = currentRotation

		function frame(now){
			const elapsed = now - start
			const t = Math.min(1, elapsed / durationMs)
			const eased = easingOutCubic(t)
			const angle = startRotation + (targetRotation - startRotation) * eased
			bottle.style.transform = `rotate(${angle}deg)`

			// Tick when crossing a player sector
			if(players.length >= 2){
				const sector = 360 / players.length
				const idx = Math.floor((((angle % 360) + 360) % 360) / sector)
				if(lastTickIndex === null) lastTickIndex = idx
				if(idx !== lastTickIndex){
					ensureAudio().tick()
					lastTickIndex = idx
				}
			}
			if(t < 1){
				requestAnimationFrame(frame)
			}else{
				currentRotation = targetRotation % 360
				setSpinning(false)
				announceAngle(currentRotation)
				resolveWinner(currentRotation)
				lastTickIndex = null
			}
		}
		requestAnimationFrame(frame)
	}

	function announceAngle(angle){
		bottle.setAttribute('aria-label', `Stopped at ${angle.toFixed(0)} degrees`)
	}

function colorPalette(i){
	const colors = ['#2fb3ff','#f9b233','#34d399','#a78bfa','#f472b6','#60a5fa','#f87171','#22d3ee','#84cc16','#facc15']
	return colors[i % colors.length]
}

function renderWheel(){
	if(!wheel || !wheelLabels) return
	const count = Math.max(players.length, 4)
	const sector = 360 / count
	let stops = []
	for(let i=0;i<count;i++){
		const start = i * sector
		const end = (i+1) * sector
		stops.push(`${colorPalette(i)} ${start}deg ${end}deg`)
	}
	wheel.style.background = `conic-gradient(${stops.join(',')})`

	wheelLabels.innerHTML = ''
	players.forEach((name, i)=>{
		const mid = i * sector + sector/2
		const span = document.createElement('div')
		span.className = 'label'
		span.textContent = name
		span.style.transform = `rotate(${mid}deg) translateX(42%) rotate(${-mid}deg)`
		wheelLabels.appendChild(span)
	})
}

function renderRim(bulbs = 24){
	if(!rim) return
	rim.innerHTML = ''
	for(let i=0;i<bulbs;i++){
		const b = document.createElement('div')
		b.className = 'bulb'
		const a = i * (360 / bulbs)
		b.style.transform = `rotate(${a}deg) translateX(46%)`
		rim.appendChild(b)
	}
}

function resolveWinner(finalAngle){
	if(players.length < 2){ if(winnerEl) winnerEl.textContent = '' ; return }
	const sector = 360 / players.length
	const normalized = ((finalAngle % 360) + 360) % 360
	const index = Math.floor(normalized / sector)
	const name = players[index]
	if(winnerEl) winnerEl.textContent = name ? `Selected: ${name}` : ''
}

	function updateControls(){
		const atMax = players.length >= 10
		addPlayerBtn.disabled = atMax || !playerInput.value.trim()
		spinBtn.disabled = isSpinning || players.length < 2
		playersHint.textContent = players.length < 2
			? 'Add 2–10 names to play.'
			: (players.length >= 10 ? 'Maximum of 10 names reached.' : `${players.length} player(s) ready.`)
	}

	function renderPlayers(){
		playersList.innerHTML = ''
		players.forEach((name, index)=>{
			const li = document.createElement('li')
			li.innerHTML = `<span>${name}</span> <button type="button" aria-label="Remove ${name}" data-index="${index}">×</button>`
			playersList.appendChild(li)
		})
	updateControls()
	renderWheel()
	}

	function addPlayer(){
		const name = playerInput.value.trim()
		if(!name) return
		if(players.length >= 10) return
		players.push(name)
		playerInput.value = ''
	renderPlayers()
		playerInput.focus()
	}

	function removePlayer(index){
		players.splice(index, 1)
	renderPlayers()
	}

	spinBtn.addEventListener('click', spin)
	bottle.addEventListener('click', spin)
	addPlayerBtn?.addEventListener('click', addPlayer)
	playerInput?.addEventListener('keydown', (e)=>{
		if(e.key === 'Enter'){
			e.preventDefault()
			addPlayer()
		}
	})
	playersList?.addEventListener('click', (e)=>{
		const target = e.target
		if(target && target.matches('button[data-index]')){
			const idx = parseInt(target.getAttribute('data-index'))
			if(!Number.isNaN(idx)) removePlayer(idx)
		}
	})

	document.addEventListener('keydown', (e)=>{
		if(e.code === 'Space' || e.code === 'Enter'){
			e.preventDefault()
			if(!spinBtn.disabled) spin()
		}
	})

	bottle.style.transform = 'rotate(0deg)'
	announceAngle(0)
	updateControls()
renderWheel()
renderRim(24)
})()
