class NeuralNetworkBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.nodes = [];
    this.frameId = 0;
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.lastTime = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('pointerout', this.handlePointerLeave, { passive: true });
    this.handleResize();
    this.frameId = window.requestAnimationFrame(this.animate);
  }

  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.width * this.pixelRatio);
    this.canvas.height = Math.floor(this.height * this.pixelRatio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    const targetCount = this.width < 640
      ? Math.max(20, Math.round(this.width * this.height / 24000))
      : Math.min(72, Math.max(30, Math.round(this.width * this.height / 18000)));
    this.createNodes(targetCount);
  }

  createNodes(count) {
    this.nodes = Array.from({ length: count }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = this.reducedMotion.matches ? 0.002 : 0.003 + Math.random() * 0.003;
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        baseX: Math.cos(angle) * speed,
        baseY: Math.sin(angle) * speed,
        phase: Math.random() * Math.PI * 2,
        phaseOffset: index * 0.37,
        radius: 1.2 + Math.random() * 0.8
      };
    });
  }

  handlePointerMove(event) {
    this.pointer.targetX = event.clientX;
    this.pointer.targetY = event.clientY;
    this.pointer.active = true;
  }

  handlePointerLeave(event) {
    if (!event.relatedTarget) {
      this.pointer.active = false;
    }
  }

  update(delta) {
    const easing = Math.min(1, delta * 0.008);
    this.pointer.x += (this.pointer.targetX - this.pointer.x) * easing;
    this.pointer.y += (this.pointer.targetY - this.pointer.y) * easing;

    if (!this.reducedMotion.matches) {
      const time = performance.now() * 0.0001;
      this.nodes.forEach((node) => {
        const directionX = Math.sin(time + node.phase + node.phaseOffset) * 0.002;
        const directionY = Math.cos(time * 0.9 + node.phase) * 0.002;
        node.x += (node.baseX + directionX) * delta;
        node.y += (node.baseY + directionY) * delta;

        if (node.x < -24) node.x = this.width + 24;
        if (node.x > this.width + 24) node.x = -24;
        if (node.y < -24) node.y = this.height + 24;
        if (node.y > this.height + 24) node.y = -24;
      });
    }
  }

  influenceAt(node) {
    if (!this.pointer.active) return 0;
    const distance = Math.hypot(node.x - this.pointer.x, node.y - this.pointer.y);
    return Math.max(0, 1 - distance / 275) ** 2;
  }

  centerInfluenceAt(node) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const distance = Math.hypot(node.x - centerX, node.y - centerY);
    const radius = Math.min(this.width, this.height) * 0.55;
    return Math.max(0, 1 - distance / radius) ** 2 * 0.38;
  }

  draw() {
    const context = this.context;
    const neutral = { red: 105, green: 119, blue: 139 };
    const active = { red: 42, green: 211, blue: 224 };
    context.clearRect(0, 0, this.width, this.height);
    context.lineWidth = 0.7;

    for (let first = 0; first < this.nodes.length; first += 1) {
      const firstNode = this.nodes[first];
      for (let second = first + 1; second < this.nodes.length; second += 1) {
        const secondNode = this.nodes[second];
        const distance = Math.hypot(firstNode.x - secondNode.x, firstNode.y - secondNode.y);
        if (distance > 155) continue;

        const influence = Math.max(this.influenceAt(firstNode), this.influenceAt(secondNode));
        const centerInfluence = Math.max(this.centerInfluenceAt(firstNode), this.centerInfluenceAt(secondNode));
        const combinedInfluence = Math.min(1, influence + centerInfluence);
        const centerNeutral = {
          red: neutral.red - centerInfluence * 20,
          green: neutral.green - centerInfluence * 20,
          blue: neutral.blue - centerInfluence * 18
        };
        const opacity = 0.1 + centerInfluence * 0.16 + influence * 0.3;
        const red = Math.round(centerNeutral.red + (active.red - centerNeutral.red) * influence);
        const green = Math.round(centerNeutral.green + (active.green - centerNeutral.green) * influence);
        const blue = Math.round(centerNeutral.blue + (active.blue - centerNeutral.blue) * influence);
        context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${opacity})`;
        context.beginPath();
        context.moveTo(firstNode.x, firstNode.y);
        context.lineTo(secondNode.x, secondNode.y);
        context.stroke();
      }
    }

    this.nodes.forEach((node) => {
      const influence = this.influenceAt(node);
      const centerInfluence = this.centerInfluenceAt(node);
      const centerNeutral = {
        red: neutral.red - centerInfluence * 20,
        green: neutral.green - centerInfluence * 20,
        blue: neutral.blue - centerInfluence * 18
      };
      const red = Math.round(centerNeutral.red + (active.red - centerNeutral.red) * influence);
      const green = Math.round(centerNeutral.green + (active.green - centerNeutral.green) * influence);
      const blue = Math.round(centerNeutral.blue + (active.blue - centerNeutral.blue) * influence);
      const radius = node.radius + centerInfluence * 0.35 + influence * 1.1;
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${0.4 + centerInfluence * 0.24 + influence * 0.48})`;
      context.beginPath();
      context.arc(node.x, node.y, radius, 0, Math.PI * 2);
      context.fill();
    });
  }

  animate(timestamp) {
    const delta = this.lastTime ? Math.min(timestamp - this.lastTime, 40) : 16;
    this.lastTime = timestamp;
    this.update(delta);
    this.draw();
    this.frameId = window.requestAnimationFrame(this.animate);
  }

  destroy() {
    window.cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerout', this.handlePointerLeave);
  }
}

const networkCanvas = document.querySelector('[data-neural-network]');
if (networkCanvas) {
  window.neuralNetworkBackground = new NeuralNetworkBackground(networkCanvas);
}
