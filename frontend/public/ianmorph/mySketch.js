let f1, f2
let img1, img2
let r
let nodeColor
let hoveredNodeColor
let secondaryNodeColor
let origMouse
let saveField
let loadField
let loadLabel
let tex1, tex2
let texGraphic
let displayMode

const nodeR = 7
const nodesPerSide = 10
function makeInitialNodes() {
	const nodes = []
	for (let x = 0; x < nodesPerSide; x++) {
		const u = x / (nodesPerSide - 1)
		for (let y = 0; y < nodesPerSide; y++) {
			const v = y / (nodesPerSide - 1)
			nodes.push({
				x: u,
				y: v,
				u,
				v,
				proximity: 0,
			})
		}
	}
	return nodes
}
let nodes1 = makeInitialNodes()
let nodes2 = makeInitialNodes()
let committedNodes1 = nodes1.map((n) => ({ ...n }))
let committedNodes2 = nodes2.map((n) => ({ ...n }))
let dragging = false
let primaryIndex = 0
let fbo, fbo2

function setup() {
	createCanvas(windowWidth, windowHeight, WEBGL)
	setAttributes({ premultipliedAlpha: true, antialias: true })
	texGraphic = createGraphics(1000, 1000)
	texGraphic.translate(texGraphic.width/2, texGraphic.height/2)
	texGraphic.imageMode(CENTER)
	
	nodeColor = color('blue')
	hoveredNodeColor = color('lime')
	secondaryNodeColor = color('red')
	
	fbo = createFramebuffer()
	fbo2 = createFramebuffer()
	
	drawingContext.pixelStorei(drawingContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
	drawingContext.disable(drawingContext.DEPTH_TEST)
	
	displayMode = createSelect()
	displayMode.option('Animate back-and-forth')
	displayMode.option('Animate continuous')
	displayMode.option('Steps')
	displayMode.selected('Animated')
	displayMode.position(width * 0.5, height * 0.15)
	
	f1 = createFileInput(handleFile1)
	f2 = createFileInput(handleFile2)
	f1.position(width * 0.333, height * 0.1)
	f2.position(width * 0.667, height * 0.1)
	
	r = createSlider(1, 100, 50)
	r.position(width * 0.5, height * 0.1)
	
	saveField = createButton('Save')
	saveField.mousePressed(() => saveJSON([nodes1, nodes2], 'nodes.json'))
	saveField.position(width * 0.4, height * 0.9)
	
	loadField = createFileInput(handleLoadNodes)
	loadField.position(width * 0.6, height * 0.9)
	loadLabel = createP('Load:')
	loadLabel.position(width * 0.55, height * 0.9)
	
	origMouse = createVector()
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight)
	displayMode.position(width * 0.5, height * 0.15)
	f1.position(width * 0.333, height * 0.1)
	f2.position(width * 0.667, height * 0.1)
	r.position(width * 0.5, height * 0.1)
	saveField.position(width * 0.4, height * 0.9)
	loadField.position(width * 0.6, height * 0.9)
	loadLabel.position(width * 0.55, height * 0.9)
}

function mousePressed() {
	dragging = true
	committedNodes1 = nodes1.map((n) => ({ ...n }))
	committedNodes2 = nodes2.map((n) => ({ ...n }))
	origMouse = createVector(mouseX, mouseY)
}

function mouseReleased() {
	dragging = false
	committedNodes1 = nodes1.map((n) => ({ ...n }))
	committedNodes2 = nodes2.map((n) => ({ ...n }))
}

function handleFile1(file) {
	if (img1) {
		img1.remove()
		img1 = undefined
		tex1 = undefined
	}
	if (file.type === 'image') {
    img1 = createImg(file.data, '', 'anonymous', () => {
			texGraphic.clear()
			texGraphic.push()
			texGraphic.scale(min(texGraphic.width/img1.width, texGraphic.height/img1.height))
			texGraphic.image(img1, 0, 0)
			texGraphic.pop()
			tex1 = texGraphic.get()
		})
    img1.hide()
	}
}

function handleFile2(file) {
	if (img2) {
		img2.remove()
		img2 = undefined
		tex2 = undefined
	}
	if (file.type === 'image') {
    img2 = createImg(file.data, '', 'anonymous', () => {
			texGraphic.clear()
			texGraphic.push()
			texGraphic.scale(min(texGraphic.width/img2.width, texGraphic.height/img2.height))
			texGraphic.image(img2, 0, 0)
			texGraphic.pop()
			tex2 = texGraphic.get()
		})
    img2.hide()
	}
}

function handleLoadNodes(file) {
	[nodes1, nodes2] = file.data
}

const sideLength = 400
const spacing = 100
const editorW = 3 * (sideLength + spacing)
const editorH = sideLength + 2 * spacing
function draw() {
	background(255)
	if (!dragging) {
		primaryIndex = mouseX < width/2 ? 0 : 1
	}
	// clear()
	const editorScale = min(width/editorW, height/editorH)
	push()
	scale(editorScale)
	
	if (dragging) {
		const mouseDiff = createVector(mouseX, mouseY).sub(origMouse).div(editorScale * sideLength)
		const nodes = primaryIndex === 0 ? nodes1 : nodes2
		const committedNodes = primaryIndex === 0 ? committedNodes1 : committedNodes2
		nodes.forEach((node, i) => {
			node.x = lerp(committedNodes[i].x + mouseDiff.x, committedNodes[i].x, node.proximity)
			node.y = lerp(committedNodes[i].y + mouseDiff.y, committedNodes[i].y, node.proximity)
		})
	}
	
	fbo2.draw(() => {
		clear()
		if (displayMode.value() === 'Animate back-and-forth') {
			drawMorph(map(sin(millis() * 0.002), -1, 1, 0, 1))
		} else if (displayMode.value() === 'Animate continuous') {
			drawMorph(millis() * 0.001 % 1)
		} else {
			const numSteps = 5
			for (let step = 0; step < numSteps; step++) {
				const off = map(step, 0, numSteps-1, -100, 100)
				push()
				translate(off, off)
				scale(0.5)
				drawMorph(step / (numSteps - 1))
				pop()
			}
		}
	})
	push()
	noStroke()
	texture(fbo2.color)
	plane(width, -height)
	pop()
	
	const keyframes = [
		{
			x: -(sideLength + spacing),
			img: img1,
			nodes: nodes1,
			id: 0,
			localMouse: createVector(mouseX, mouseY).sub(width/2, height/2).div(editorScale).sub(-(sideLength + spacing), 0)
		},
		{
			x: (sideLength + spacing),
			img: img2,
			nodes: nodes2,
			id: 1,
			localMouse: createVector(mouseX, mouseY).sub(width/2, height/2).div(editorScale).sub((sideLength + spacing), 0)
		}
	]
	if (!dragging) {
		for (const frame of keyframes) {
			for (let row = 0; row < nodesPerSide; row++) {
				for (let col = 0; col < nodesPerSide; col++) {
					const node = frame.nodes[row * nodesPerSide + col]
					const proximity = nodeProximity(
						frame.localMouse,
						node
					)
					node.proximity = proximity
				}
			}
		}
	}
	for (const frame of keyframes) {
		const other = keyframes[1 - frame.id]
		push()
		translate(frame.x, 0)
		if (frame.img) {
			push()
			scale(min(sideLength/frame.img.width, sideLength/frame.img.height))
			imageMode(CENTER)
			image(frame.img, 0, 0)
			pop()
		}
		
		noFill()
		stroke(0)
		for (let row = 0; row < nodesPerSide - 1; row++) {
			beginShape(QUAD_STRIP)
			for (let col = 0; col < nodesPerSide; col++) {
				for (let off = 0; off < 2; off++) {
					const node = frame.nodes[(row + off) * nodesPerSide + col]
					vertex(
						map(node.x, 0, 1, -sideLength/2, sideLength/2),
						map(node.y, 0, 1, -sideLength/2, sideLength/2)
					)
				}
			}
			endShape()
		}
		
		noStroke()
		for (let row = 0; row < nodesPerSide; row++) {
			for (let col = 0; col < nodesPerSide; col++) {
				const node = frame.nodes[row * nodesPerSide + col]
				const otherNode = other.nodes[row * nodesPerSide + col]
				const proximity = (primaryIndex === frame.id ? node : otherNode).proximity
				fill(lerpColor(primaryIndex === frame.id ? hoveredNodeColor : secondaryNodeColor, nodeColor, proximity))
				circle(
					map(node.x, 0, 1, -sideLength/2, sideLength/2),
					map(node.y, 0, 1, -sideLength/2, sideLength/2),
					nodeR
				)
			}
		}
		pop()
	}
	pop()
	
	push()
	noFill()
	circle(mouseX - width/2, mouseY - height/2, r.value() * editorScale)
	pop()
}

function drawMorph(t) {
	if (tex1 && tex2) {
		push()
		textureMode(NORMAL)
		const data = [{ img: tex1, id: 0, nodes: nodes1 }, { img: tex2, id: 1, nodes: nodes2 }]
		for (const frame of data) {
			let alpha = t
			if (frame.id === 0) alpha = 1 - alpha
			fbo.draw(() => {
				push()
				clear()
				texture(frame.img)
				noStroke()
				for (let row = 0; row < nodesPerSide - 1; row++) {
					beginShape(QUAD_STRIP)
					for (let col = 0; col < nodesPerSide; col++) {
						for (let off = 0; off < 2; off++) {
							const node1 = nodes1[(row + off) * nodesPerSide + col]
							const node2 = nodes2[(row + off) * nodesPerSide + col]
							const node = frame.id === 0 ? node1 : node2
							vertex(
								map(lerp(node1.x, node2.x, t), 0, 1, -sideLength/2, sideLength/2),
								map(lerp(node1.y, node2.y, t), 0, 1, -sideLength/2, sideLength/2),
								0,
								node.x,
								node.y
							)
						}
					}
					endShape()
				}
				pop()
			})
			push()
			blendMode(ADD)
			noStroke()
			texture(fbo.color)
			tint(255, alpha * 255)
			plane(width, -height)
			pop()
		}
		pop()
	}
}

function nodeProximity(mouse, node) {
	const nodeX = map(node.x, 0, 1, -sideLength/2, sideLength/2)
	const nodeY = map(node.y, 0, 1, -sideLength/2, sideLength/2)
	const dist = createVector(nodeX, nodeY).sub(mouse).mag() - nodeR
	return constrain(dist/r.value(), 0, 1)
}