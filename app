<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rounded Corner Cropper</title>
  <style>
    :root { --bg:#0f1115; --panel:#171a21; --muted:#a7b0c0; --text:#e9eef8; --accent:#6ea8fe; }
    html,body{height:100%;}
    body{margin:0;font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:var(--bg); color:var(--text);}
    .wrap{max-width:960px;margin:0 auto;padding:24px;}
    h1{font-size:20px;margin:0 0 12px}
    .card{background:var(--panel);border-radius:16px;box-shadow:0 6px 30px rgba(0,0,0,.35);padding:16px;}
    .grid{display:grid;grid-template-columns:1fr;gap:12px}
    @media (min-width:860px){.grid{grid-template-columns: 340px 1fr;}}
    label{font-size:12px;color:var(--muted);display:block;margin:0 0 4px}
    input[type="number"],select,input[type="file"]{width:100%;padding:10px 12px;border-radius:10px;border:1px solid #2a2f3a;background:#0f1320;color:var(--text)}
    .row{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
    .row3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .row4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    button{appearance:none;background:var(--accent);color:#0c1222;border:none;border-radius:10px;padding:10px 14px;font-weight:600;cursor:pointer}
    button.secondary{background:#2a2f3a;color:var(--text)}
    .preview{display:flex;align-items:center;justify-content:center;background:#0c0f15;border:1px solid #2a2f3a;border-radius:16px;min-height:320px}
    .hint{font-size:12px;color:var(--muted)}
    canvas{max-width:100%;height:auto;border-radius:12px}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Rounded Corner Cropper</h1>
    <div class="card grid">
      <div>
        <div class="row3">
          <div>
            <label>Target width (px)</label>
            <input id="w" type="number" inputmode="numeric" placeholder="e.g. 1200" />
          </div>
          <div>
            <label>Target height (px)</label>
            <input id="h" type="number" inputmode="numeric" placeholder="e.g. 628" />
          </div>
          <div>
            <label>Fit</label>
            <select id="fit">
              <option value="cover" selected>cover (fill, crop overflow)</option>
              <option value="contain">contain (fit inside, letterbox)</option>
            </select>
          </div>
        </div>

        <div class="row3">
          <div>
            <label>Gravity (x)</label>
            <select id="gx">
              <option value="center" selected>center</option>
              <option value="left">left</option>
              <option value="right">right</option>
            </select>
          </div>
          <div>
            <label>Gravity (y)</label>
            <select id="gy">
              <option value="center" selected>center</option>
              <option value="top">top</option>
              <option value="bottom">bottom</option>
            </select>
          </div>
          <div>
            <label>Uniform radius (px)</label>
            <input id="rAll" type="number" inputmode="numeric" placeholder="0" />
          </div>
        </div>

        <div class="row4">
          <div>
            <label>Radius TL</label>
            <input id="rTL" type="number" inputmode="numeric" placeholder="0" />
          </div>
          <div>
            <label>Radius TR</label>
            <input id="rTR" type="number" inputmode="numeric" placeholder="0" />
          </div>
          <div>
            <label>Radius BR</label>
            <input id="rBR" type="number" inputmode="numeric" placeholder="0" />
          </div>
          <div>
            <label>Radius BL</label>
            <input id="rBL" type="number" inputmode="numeric" placeholder="0" />
          </div>
        </div>

        <div>
          <label>Image</label>
          <input id="file" type="file" accept="image/*" />
          <div class="hint">Your image is processed locally in the browser; nothing is uploaded.</div>
        </div>

        <div class="row">
          <button id="run">Process</button>
          <button id="download" class="secondary" disabled>Download PNG</button>
        </div>
      </div>

      <div class="preview">
        <canvas id="out" width="0" height="0" aria-label="preview"></canvas>
      </div>
    </div>

    <p class="hint">Tips: If you only want one rounded corner, set the others to 0. Max radius is clamped to half the side.</p>
  </div>

  <script>
  const el = id => document.getElementById(id);
  const fileInput = el('file');
  const canvas = el('out');
  const ctx = canvas.getContext('2d');
  let srcImg = null;

  function readNumber(id){
    const v = parseFloat(el(id).value);
    return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null;
  }

  function clampRadius(r, w, h){
    const maxR = Math.floor(Math.min(w, h) / 2);
    return Math.max(0, Math.min(maxR, r||0));
  }

  function drawRoundedRectPath(ctx, w, h, r){
    const tl = clampRadius(r.tl, w, h), tr = clampRadius(r.tr, w, h), br = clampRadius(r.br, w, h), bl = clampRadius(r.bl, w, h);
    ctx.beginPath();
    ctx.moveTo(tl, 0);
    ctx.lineTo(w - tr, 0);
    if (tr) ctx.quadraticCurveTo(w, 0, w, tr); else ctx.lineTo(w, 0);
    ctx.lineTo(w, h - br);
    if (br) ctx.quadraticCurveTo(w, h, w - br, h); else ctx.lineTo(w, h);
    ctx.lineTo(bl, h);
    if (bl) ctx.quadraticCurveTo(0, h, 0, h - bl); else ctx.lineTo(0, h);
    ctx.lineTo(0, tl);
    if (tl) ctx.quadraticCurveTo(0, 0, tl, 0); else ctx.lineTo(0, 0);
    ctx.closePath();
  }

  function computeCoverContain(srcW, srcH, dstW, dstH, fit, gx, gy){
    if (!dstW || !dstH) return {sx:0, sy:0, sw:srcW, sh:srcH, dx:0, dy:0, dw:srcW, dh:srcH};
    const srcAR = srcW / srcH, dstAR = dstW / dstH;
    if (fit === 'contain'){
      let scale = srcAR > dstAR ? dstW / srcW : dstH / srcH;
      const dw = Math.round(srcW * scale), dh = Math.round(srcH * scale);
      const dx = gx==='left'?0 : gx==='right'?(dstW - dw) : Math.round((dstW - dw)/2);
      const dy = gy==='top'?0 : gy==='bottom'?(dstH - dh) : Math.round((dstH - dh)/2);
      return {sx:0, sy:0, sw:srcW, sh:srcH, dx, dy, dw, dh};
    } else { // cover
      let scale = srcAR < dstAR ? dstW / srcW : dstH / srcH;
      const cw = Math.round(dstW / scale), ch = Math.round(dstH / scale);
      const sx = gx==='left'?0 : gx==='right'?(srcW - cw) : Math.round((srcW - cw)/2);
      const sy = gy==='top'?0 : gy==='bottom'?(srcH - ch) : Math.round((srcH - ch)/2);
      return {sx, sy, sw:cw, sh:ch, dx:0, dy:0, dw:dstW, dh:dstH};
    }
  }

  function fileToImage(file){
    return new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = fr.result;
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  async function run(){
    if (!srcImg){ alert('Choose an image first.'); return; }
    const W = readNumber('w');
    const H = readNumber('h');
    const fit = el('fit').value;
    const gx = el('gx').value;
    const gy = el('gy').value;

    const rA = readNumber('rAll');
    const r = {
      tl: readNumber('rTL'), tr: readNumber('rTR'), br: readNumber('rBR'), bl: readNumber('rBL')
    };
    if (rA !== null){ r.tl = r.tr = r.br = r.bl = rA; }

    // Destination size
    const dstW = W || srcImg.naturalWidth;
    const dstH = H || srcImg.naturalHeight;
    canvas.width = dstW; canvas.height = dstH;

    // Clear
    ctx.clearRect(0,0,dstW,dstH);

    // Clip rounded rect
    drawRoundedRectPath(ctx, dstW, dstH, r);
    ctx.clip();

    // Draw image according to fit
    const {sx,sy,sw,sh,dx,dy,dw,dh} = computeCoverContain(srcImg.naturalWidth, srcImg.naturalHeight, dstW, dstH, fit, gx, gy);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(srcImg, sx, sy, sw, sh, dx, dy, dw, dh);

    // Enable download
    el('download').disabled = false;
  }

  fileInput.addEventListener('change', async (e)=>{
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    srcImg = await fileToImage(f);
    // Auto-run with current settings once image loads
    run();
  });

  el('run').addEventListener('click', run);
  el('download').addEventListener('click', ()=>{
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = 'rounded-corner.png';
    document.body.appendChild(a); a.click(); a.remove();
  });
  </script>
</body>
</html>
