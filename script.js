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
const wheelTicks = document.getElementById('wheelTicks')
	const winnerEl = document.getElementById('winner')
	const rim = document.getElementById('rim')
	const topPickEl = document.getElementById('topPick')
	const preferToggle = document.getElementById('preferToggle')
	const preferredPlayerSelect = document.getElementById('preferredPlayerSelect')

	let isSpinning = false
	let currentRotation = 0
	let spinAudio
	let players = []
	let lastTickIndex = null
	const POINTER_OFFSET_DEG = 90 // bottle head points right at 0deg; pointer triangle is at top
	let selectionCounts = [] // parallel to players
	let preferredIndex = -1
	let biasProbability = 0.8

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
		let finalAngle
		if(preferToggle?.checked && preferredIndex >= 0 && preferredIndex < players.length && Math.random() < biasProbability){
			const sector = 360 / players.length
			// choose a random position inside the preferred sector
			const pointerAlignedDesired = preferredIndex * sector + randomBetween(0, sector)
			// invert pointer alignment mapping used in resolveWinner
			finalAngle = (pointerAlignedDesired - POINTER_OFFSET_DEG - sector/2 + 360*10) % 360
		}else{
			finalAngle = randomBetween(0, 360)
		}
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

			// Tick when crossing a player sector (aligned to pointer at top)
			if(players.length >= 2){
				const sector = 360 / players.length
				const normalized = (((angle % 360) + 360) % 360)
				const pointerAligned = (normalized + POINTER_OFFSET_DEG + sector/2) % 360
				const idx = Math.floor(pointerAligned / sector)
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
	const count = Math.max(players.length, 1)
	const sector = 360 / count
	const radiusPx = Math.max(0, (wheel.clientWidth/2) - 18)
    const labelOffset = -90 // align label centers with visual sector centers
	let stops = []
	for(let i=0;i<count;i++){
		const start = i * sector
		const end = (i+1) * sector
		stops.push(`${colorPalette(i)} ${start}deg ${end}deg`)
	}
	wheel.style.background = `conic-gradient(${stops.join(',')})`

	wheelLabels.innerHTML = ''
	if(wheelTicks){
		wheelTicks.innerHTML = ''
		for(let i=0;i<count;i++){
			const t = document.createElement('div')
			t.className = 'tick'
			t.style.transform = `rotate(${i*sector}deg)`
			wheelTicks.appendChild(t)
		}
	}
players.forEach((name, i)=>{
    const mid = i * sector + sector/2 + labelOffset
    const rad = (mid * Math.PI) / 180
    const cx = wheel.clientWidth / 2
    const cy = wheel.clientHeight / 2
    const x = cx + Math.cos(rad) * radiusPx
    const y = cy + Math.sin(rad) * radiusPx
    const span = document.createElement('div')
    span.className = 'label'
    span.textContent = name
    span.style.left = `${x}px`
    span.style.top = `${y}px`
    span.style.transform = 'translate(-50%, -50%)'
    span.style.maxWidth = `${Math.max(40, Math.round(wheel.clientWidth*0.22))}px`
    span.style.textAlign = 'center'
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
	// Align bottle head (points right at 0deg) to top pointer and bias to nearest sector
	const pointerAligned = (normalized + POINTER_OFFSET_DEG + sector/2) % 360
	const index = Math.floor(pointerAligned / sector)
	const name = players[index]
	if(index >= 0 && index < selectionCounts.length){ selectionCounts[index] = (selectionCounts[index]||0) + 1 }
		if(winnerEl) winnerEl.textContent = name ? `Selected: ${name}` : ''
		updateTopPickUI()
}

// Returns the most frequently selected player so far
// { name: string, count: number, index: number } | null
function getMostSelectedPlayer(){
	if(!players.length) return null
	if(selectionCounts.length < players.length){
		// ensure alignment length-wise
		while(selectionCounts.length < players.length) selectionCounts.push(0)
	}
	let maxCount = -1
	let maxIndex = -1
	for(let i=0;i<players.length;i++){
		const c = selectionCounts[i]||0
		if(c > maxCount){ maxCount = c; maxIndex = i }
	}
	if(maxIndex === -1) return null
	return { name: players[maxIndex], count: maxCount, index: maxIndex }
}

// Returns the player with the highest selection percentage.
// { name: string, percent: number, count: number, total: number } | null
function getTopPlayerByPercentage(){
	if(!players.length) return null
	const total = selectionCounts.reduce((a,b)=>a+(b||0), 0)
	if(total === 0) return null
	let maxCount = -1
	let maxIndex = -1
	for(let i=0;i<players.length;i++){
		const c = selectionCounts[i]||0
		if(c > maxCount){ maxCount = c; maxIndex = i }
	}
	if(maxIndex === -1) return null
	const percent = (maxCount/total)*100
	return { name: players[maxIndex], percent, count: maxCount, total }
}

function updateTopPickUI(){
	if(!topPickEl) return
	const top = getTopPlayerByPercentage()
	if(!top){ topPickEl.textContent = '' ; return }
	topPickEl.textContent = `${top.name} — ${top.percent.toFixed(0)}% (${top.count}/${top.total})`
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
	renderPreferredOptions()
	renderWheel()
	updateTopPickUI()
	}

	function addPlayer(){
		const name = playerInput.value.trim()
		if(!name) return
		if(players.length >= 10) return
		players.push(name)
		selectionCounts.push(0)
		playerInput.value = ''
	renderPlayers()
		playerInput.focus()
	}

	function removePlayer(index){
		players.splice(index, 1)
		selectionCounts.splice(index, 1)
		// adjust preferred index if needed
		if(preferredIndex === index){ preferredIndex = -1 }
		else if(index < preferredIndex){ preferredIndex = preferredIndex - 1 }
		renderPlayers()
	}

	function renderPreferredOptions(){
		if(!preferredPlayerSelect) return
		preferredPlayerSelect.innerHTML = ''
		const none = document.createElement('option')
		none.value = '-1'
		none.textContent = '— none —'
		preferredPlayerSelect.appendChild(none)
		players.forEach((name, i)=>{
			const opt = document.createElement('option')
			opt.value = String(i)
			opt.textContent = name
			preferredPlayerSelect.appendChild(opt)
		})
		const toSelect = (preferredIndex >=0 && preferredIndex < players.length) ? String(preferredIndex) : '-1'
		preferredPlayerSelect.value = toSelect
		updateControls()
	}

	function syncPreferredFromSelect(){
		if(!preferredPlayerSelect) return
		const idx = parseInt(preferredPlayerSelect.value)
		preferredIndex = Number.isNaN(idx) ? -1 : idx
	}

	spinBtn.addEventListener('click', spin)
	bottle.addEventListener('click', spin)
	addPlayerBtn?.addEventListener('click', addPlayer)
	preferredPlayerSelect?.addEventListener('change', syncPreferredFromSelect)
	preferToggle?.addEventListener('change', ()=>{/* no-op; state read during spin */})
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

// Expose helper to window for easy access
window.getMostSelectedPlayer = getMostSelectedPlayer
window.getTopPlayerByPercentage = getTopPlayerByPercentage
window.setPreferredPlayer = function setPreferredPlayer(player, probability){
	if(typeof probability === 'number' && probability >= 0 && probability <= 1){ biasProbability = probability }
	let idx = -1
	if(typeof player === 'number'){
		idx = player
	}else if(typeof player === 'string'){
		const lower = player.trim().toLowerCase()
		idx = players.findIndex(n=>n.toLowerCase() === lower)
	}
	preferredIndex = (idx >=0 && idx < players.length) ? idx : -1
	if(preferToggle){ preferToggle.checked = preferredIndex !== -1 }
	renderPreferredOptions()
}
window.clearPreferredPlayer = function clearPreferredPlayer(){
	preferredIndex = -1
	if(preferToggle){ preferToggle.checked = false }
	renderPreferredOptions()
}

	bottle.style.transform = 'rotate(0deg)'
	announceAngle(0)
	updateControls()
renderWheel()
renderRim(24)
	updateTopPickUI()
	renderPreferredOptions()
})()
