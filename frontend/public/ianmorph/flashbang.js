// Flashbang version - auto-loads images and morphs continuously
let img1, img2
let tex1, tex2
let texGraphic
let fbo, fbo2
let nodesData

const nodesPerSide = 10
let nodes1, nodes2

const sideLength = 800

function preload() {
  // Load nodes data
  nodesData = loadJSON('nodes (1).json')
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL)
  setAttributes({ premultipliedAlpha: true, antialias: true })
  texGraphic = createGraphics(1000, 1000)
  texGraphic.translate(texGraphic.width/2, texGraphic.height/2)
  texGraphic.imageMode(CENTER)
  
  fbo = createFramebuffer()
  fbo2 = createFramebuffer()
  
  drawingContext.pixelStorei(drawingContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  drawingContext.disable(drawingContext.DEPTH_TEST)
  
  // Load images
  loadImage('IAN1.jpg', (loaded) => {
    img1 = loaded
    texGraphic.clear()
    texGraphic.push()
    texGraphic.scale(min(texGraphic.width/img1.width, texGraphic.height/img1.height))
    texGraphic.image(img1, 0, 0)
    texGraphic.pop()
    tex1 = texGraphic.get()
  })
  
  loadImage('IAN2.jpg', (loaded) => {
    img2 = loaded
    texGraphic.clear()
    texGraphic.push()
    texGraphic.scale(min(texGraphic.width/img2.width, texGraphic.height/img2.height))
    texGraphic.image(img2, 0, 0)
    texGraphic.pop()
    tex2 = texGraphic.get()
  })
  
  // Parse nodes data
  if (nodesData && nodesData.length === 2) {
    nodes1 = nodesData[0]
    nodes2 = nodesData[1]
  } else {
    // Fallback to default grid
    nodes1 = makeInitialNodes()
    nodes2 = makeInitialNodes()
  }
}

function makeInitialNodes() {
  const nodes = []
  for (let x = 0; x < nodesPerSide; x++) {
    const u = x / (nodesPerSide - 1)
    for (let y = 0; y < nodesPerSide; y++) {
      const v = y / (nodesPerSide - 1)
      nodes.push({ x: u, y: v, u, v, proximity: 0 })
    }
  }
  return nodes
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}

function draw() {
  background(255)
  
  fbo2.draw(() => {
    clear()
    // Continuous morphing animation - full cycle every 2 seconds
    drawMorph((millis() * 0.0005) % 1)
  })
  
  push()
  noStroke()
  texture(fbo2.color)
  plane(width, -height)
  pop()
}

function drawMorph(t) {
  if (tex1 && tex2 && nodes1 && nodes2) {
    push()
    textureMode(NORMAL)
    
    // Scale to fill screen
    const morphScale = min(width, height) / sideLength * 1.5
    
    const data = [{ img: tex1, id: 0, nodes: nodes1 }, { img: tex2, id: 1, nodes: nodes2 }]
    for (const frame of data) {
      let alpha = t
      if (frame.id === 0) alpha = 1 - alpha
      fbo.draw(() => {
        push()
        clear()
        texture(frame.img)
        noStroke()
        scale(morphScale)
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

