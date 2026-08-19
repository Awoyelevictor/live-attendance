export function startAnimatedFavicon() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  function drawClock() {
    const now = new Date();
    ctx.clearRect(0, 0, 64, 64);

    // Background Gradient (Dark Theme / Indigo)
    const grad = ctx.createLinearGradient(0, 0, 64, 64);
    grad.addColorStop(0, '#4f46e5'); // indigo-600
    grad.addColorStop(1, '#7c3aed'); // violet-600
    
    // Clock face
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();

    // Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e0e7ff'; // indigo-100
    ctx.stroke();

    // Calculate angles
    const sec = now.getSeconds();
    const min = now.getMinutes();
    const hr = now.getHours() % 12;

    const secAngle = (sec * Math.PI) / 30;
    const minAngle = (min * Math.PI) / 30 + (sec * Math.PI) / (30 * 60);
    const hrAngle = (hr * Math.PI) / 6 + (min * Math.PI) / (6 * 60);

    // Draw Hour Hand
    drawHand(ctx, hrAngle, 14, 4, '#ffffff');
    
    // Draw Minute Hand
    drawHand(ctx, minAngle, 20, 3, '#ffffff');
    
    // Draw Second Hand (Amber)
    drawHand(ctx, secAngle, 22, 2, '#fbbf24'); // amber-400

    // Center dot
    ctx.beginPath();
    ctx.arc(32, 32, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // Update favicon
    link.href = canvas.toDataURL('image/png');
  }

  function drawHand(ctx, angle, length, width, color) {
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.moveTo(32, 32);
    ctx.lineTo(32 + Math.sin(angle) * length, 32 - Math.cos(angle) * length);
    ctx.stroke();
  }

  // Initial draw and interval
  drawClock();
  setInterval(drawClock, 1000);
}
