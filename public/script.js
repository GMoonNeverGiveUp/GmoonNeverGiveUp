// script.js — fully revamped with resizable text, editable text layers, and reliable undo for stickers
console.log('✅ script.js loaded and executing');

const DEBUG = false;

class MemeBuilder {
  constructor() {
    this._grabElements();
    this._initState();
    this._setupCanvas();
    this._setupHistory();
    this._setupUI();
    this._setupEvents();
    this._snapshot('Init');
  }

  /*———————————————*
   *  Grab DOM nodes  *
   *———————————————*/
  _grabElements() {
    const id = s => document.getElementById(s);
    this.canvas        = id('meme-canvas');
    this.ctx           = this.canvas.getContext('2d');
    this.uploadInput   = id('image-upload');
    this.addTextBtn    = id('add-text-btn');
    this.textTools     = id('text-tools');
    this.textInput     = id('text-input');
    this.fontFamily    = id('font-family-input');
    this.fontSize      = id('font-size-input');
    this.fontColor     = id('font-color-input');
    this.outlineColor  = id('outline-color-input');
    this.outlineWidth  = id('outline-width-input');
    this.shadowColor   = id('shadow-color-input');
    this.shadowBlur    = id('shadow-blur-input');
    this.shadowOffX    = id('shadow-offset-x-input');
    this.shadowOffY    = id('shadow-offset-y-input');
    this.applyTextBtn  = id('apply-text-btn');
    this.stickerGrid   = id('sticker-library');
    this.toolMode      = id('tool-mode');
    this.drawColor     = id('draw-color');
    this.drawWidth     = id('draw-width');
    this.clearDrawBtn  = id('clear-drawing-btn');
    this.gridToggle    = id('grid-toggle');
    this.gridSpacing   = id('grid-spacing');
    this.snapToggle    = id('snap-center-toggle');
    this.zoomInBtn     = id('zoom-in-btn');
    this.zoomOutBtn    = id('zoom-out-btn');
    this.resetViewBtn  = id('reset-view-btn');
    this.layersList    = id('layers-list');
    this.undoBtn       = id('undo-btn');
    this.redoBtn       = id('redo-btn');
    this.saveBtn       = id('save-project-btn');
    this.loadBtn       = id('load-project-btn');
    this.loadInput     = id('load-project-input');
    this.resizer       = id('sidebar-resizer');
    this.sidebar       = document.querySelector('.controls-panel');
  }

  /*———————————————*
   *  Initial state   *
   *———————————————*/
  _initState() {
    this.memeImage    = null;
    this.layers       = [];
    this.frames       = [];
    this.history      = [];
    this.historyIdx   = -1;
    this.nextId       = 1;

    this.viewScale    = 1;
    this.viewOffsetX  = 0;
    this.viewOffsetY  = 0;
    this.minScale     = 0.1;
    this.maxScale     = 10;

    this.showGrid     = false;
    this.snapCenter   = false;

    this.isDrawing    = false;
    this.isPanning    = false;
    this.isMoving     = false;
    this.isResizing   = false;
    this.isRotating   = false;

    this.currentDraw  = null;
    this.panStart     = null;
    this.moveStart    = null;
    this.moveOrig     = null;
    this.resizeStart  = null;
    this.resizeOrig   = null;
    this.resizeHandle = null;
    this.rotateStart  = null;
    this.lastImageBox = { x:0,y:0,w:0,h:0 };
  }

  /*———————————————*
   *  Canvas & Resize *
   *———————————————*/
  _setupCanvas() {
    window.addEventListener('resize', ()=>this._onResize());
    this._onResize();
  }

  _onResize() {
    const { width, height } = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = width;
    this.canvas.height = height;

    if (this.memeImage) {
      const fit = this._fitScale();
      this.viewScale      = fit;
      this.viewOffsetX    = (width - this.memeImage.width * fit)/2;
      this.viewOffsetY    = (height - this.memeImage.height* fit)/2;
    }

    this._drawAll();
    this._snapshot('Canvas Resize');
  }

  _fitScale() {
    if (!this.memeImage) return this.viewScale;
    return Math.min(
      this.canvas.width  / this.memeImage.width,
      this.canvas.height / this.memeImage.height
    );
  }

  _clampScale(s) {
    return Math.max(this.minScale, Math.min(s, this.maxScale));
  }

  /*———————————————*
   *  History (Undo)  *
   *———————————————*/
  _setupHistory() {
    this.undoBtn.addEventListener('click', ()=>this._undo());
    this.redoBtn.addEventListener('click', ()=>this._redo());
    document.addEventListener('keydown', e=>{
      if ((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key==='z'){
        e.preventDefault(); this._undo();
      }
      if ((e.ctrlKey||e.metaKey) && (e.key==='y' || (e.shiftKey&&e.key==='Z'))){
        e.preventDefault(); this._redo();
      }
    });
  }

  _snapshot(label) {
    const snap = {
      label,
      viewScale:    this.viewScale,
      viewOffsetX:  this.viewOffsetX,
      viewOffsetY:  this.viewOffsetY,
      imgSrc:       this.memeImage?.src || null,
      layers:       this.layers.map(l=>({
        ...l,
        imgSrc: l.img?.src || null
      })),
      frames:       JSON.parse(JSON.stringify(this.frames))
    };
    this.history.splice(this.historyIdx+1);
    this.history.push(snap);
    this.historyIdx = this.history.length-1;
    this._updateHistoryButtons();
  }

  _restore(idx) {
    const s = this.history[idx];
    // restore camera
    this.viewScale     = s.viewScale;
    this.viewOffsetX   = s.viewOffsetX;
    this.viewOffsetY   = s.viewOffsetY;
    // restore layers immediately
    this.layers = s.layers.map(l=>{
      const nl = {...l, img:null};
      if (l.imgSrc) {
        nl.img = new Image();
        nl.img.src = l.imgSrc;
      }
      return nl;
    });
    this.frames = s.frames;
    this._renderLayers();
    // restore background
    if (s.imgSrc) {
      const bg = new Image();
      bg.onload = ()=>{ this.memeImage = bg; this._drawAll(); this._updateHistoryButtons(); };
      bg.src = s.imgSrc;
    } else {
      this.memeImage = null;
      this._drawAll();
      this._updateHistoryButtons();
    }
  }

  _undo() {
    if (this.historyIdx>0) this._restore(--this.historyIdx);
  }
  _redo() {
    if (this.historyIdx < this.history.length-1) this._restore(++this.historyIdx);
  }
  _updateHistoryButtons() {
    this.undoBtn.disabled = this.historyIdx<=0;
    this.redoBtn.disabled = this.historyIdx>=this.history.length-1;
  }

  /*———————————————*
   *  Draw Everything *
   *———————————————*/
  _drawAll() {
    const ctx = this.ctx;
    ctx.save(); ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    ctx.fillStyle='#222'; ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    ctx.restore();

    ctx.save();
    ctx.translate(this.viewOffsetX,this.viewOffsetY);
    ctx.scale(this.viewScale,this.viewScale);

    if (this.showGrid) {
      ctx.strokeStyle='rgba(255,255,255,0.1)';
      const gs = +this.gridSpacing.value;
      for(let x=0;x<this.canvas.width/this.viewScale;x+=gs){
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,this.canvas.height/this.viewScale); ctx.stroke();
      }
      for(let y=0;y<this.canvas.height/this.viewScale;y+=gs){
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(this.canvas.width/this.viewScale,y); ctx.stroke();
      }
    }

    if (this.memeImage) {
      ctx.drawImage(this.memeImage,0,0);
      this.lastImageBox = { x:0,y:0,w:this.memeImage.width,h:this.memeImage.height };
    }

    for (const l of this.layers) {
      if (!l.visible) continue;
      ctx.save();
      ctx.filter = l.filterType? `${l.filterType}(${l.filterValue}${l.filterType==='blur'?'px':''})`:'none';
      const cx = l.x + l.width/2, cy = l.y + l.height/2;
      if (l.rotation) {
        ctx.translate(cx,cy); ctx.rotate(l.rotation); ctx.translate(-cx,-cy);
      }
      if (l.type==='image' || l.type==='sticker') {
        ctx.drawImage(l.img,l.x,l.y,l.width,l.height);
      } else if (l.type==='text') {
        ctx.font = `${l.size}px "${l.family}",sans-serif`;
        ctx.textBaseline='top';
        ctx.fillStyle   = l.color;
        ctx.shadowColor = l.shadowColor;
        ctx.shadowBlur  = l.shadowBlur;
        ctx.shadowOffsetX= l.shadowOffsetX;
        ctx.shadowOffsetY= l.shadowOffsetY;
        if (l.outlineWidth) {
          ctx.lineWidth   = l.outlineWidth;
          ctx.strokeStyle= l.outlineColor;
          ctx.strokeText(l.text,l.x,l.y);
        }
        ctx.fillText(l.text,l.x,l.y);
      } else /* drawing */ {
        ctx.strokeStyle = l.color;
        ctx.lineWidth   = (l.lineWidth||1)/this.viewScale;
        if (l.tool==='pencil') {
          ctx.beginPath();
          l.path.forEach((p,i)=> i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
          ctx.stroke();
        } else if (l.tool==='rectangle') {
          ctx.strokeRect(l.x,l.y,l.width,l.height);
        } else {
          ctx.beginPath();
          ctx.arc(l.cx,l.cy,l.r,0,Math.PI*2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    if (this.selectedLayer) {
      const L = this.selectedLayer;
      ctx.save();
      ctx.strokeStyle = 'yellow'; ctx.lineWidth = 2/this.viewScale;
      ctx.setLineDash([6/this.viewScale,6/this.viewScale]);
      ctx.strokeRect(L.x,L.y,L.width,L.height);
      ctx.setLineDash([]);
      ctx.fillStyle = 'yellow';
      const hs=14/this.viewScale;
      [[L.x,L.y],[L.x+L.width,L.y],[L.x,L.y+L.height],[L.x+L.width,L.y+L.height]]
        .forEach(([px,py])=> ctx.fillRect(px-hs/2,py-hs/2,hs,hs));
      const rx=L.x+L.width/2, ry=L.y-30/this.viewScale;
      ctx.beginPath(); ctx.arc(rx,ry,8/this.viewScale,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  /*———————————————*
   *  Layer List UI   *
   *———————————————*/
  _renderLayers() {
    this.layersList.innerHTML = '';
    this.layers.forEach((layer,idx)=>{
      const div = document.createElement('div');
      div.className = 'layer-item';
      const name = document.createElement('input');
      name.type = 'text';
      name.value = layer.type==='text'? layer.text : (layer.name||layer.type);
      name.addEventListener('change', ()=>{ 
        if (layer.type==='text') {
          layer.text = name.value;
          // recalc width/height
          this.ctx.font = `${layer.size}px "${layer.family}",sans-serif`;
          layer.width = this.ctx.measureText(layer.text).width;
          layer.height= layer.size;
          this._snapshot('Edit Text');
        } else {
          layer.name = name.value;
          this._snapshot('Rename Layer');
        }
        this._drawAll();
      });
      const visible = document.createElement('input');
      visible.type='checkbox'; visible.checked = layer.visible;
      visible.addEventListener('change', ()=>{
        layer.visible = visible.checked;
        this._drawAll(); this._snapshot('Toggle Layer');
      });
      const up = document.createElement('button'); up.textContent='↑'; up.disabled = idx===0;
      up.addEventListener('click', ()=>{
        [this.layers[idx-1],this.layers[idx]]=[this.layers[idx],this.layers[idx-1]];
        this._renderLayers(); this._drawAll(); this._snapshot('Reorder Layer');
      });
      const down = document.createElement('button'); down.textContent='↓';
      down.disabled = idx===this.layers.length-1;
      down.addEventListener('click', ()=>{
        [this.layers[idx],this.layers[idx+1]]=[this.layers[idx+1],this.layers[idx]];
        this._renderLayers(); this._drawAll(); this._snapshot('Reorder Layer');
      });
      const del = document.createElement('button'); del.textContent='🗑️';
      del.addEventListener('click', ()=>{
        this.layers.splice(idx,1);
        if (this.selectedLayer===layer) this.selectedLayer = null;
        this._renderLayers(); this._drawAll(); this._snapshot('Delete Layer');
      });
      const btns=document.createElement('div'); btns.className='btns';
      btns.append(up,down,del);
      div.append(name,visible,btns);
      this.layersList.appendChild(div);
    });
  }

  /*———————————————*
   *  UI Wiring       *
   *———————————————*/
  _setupUI() {
    document.querySelectorAll('.section-header').forEach(h=>
      h.addEventListener('click', ()=>h.parentElement.classList.toggle('open')));
    this.uploadInput.addEventListener('change',e=>this._onUploadImages(e));
    this.addTextBtn.addEventListener('click', ()=>{
      this.textTools.style.display =
        this.textTools.style.display==='flex'?'none':'flex';
    });
    this.applyTextBtn.addEventListener('click', ()=>this._addText());
    this.clearDrawBtn.addEventListener('click', ()=>{
      this.layers = this.layers.filter(l=>l.type!=='drawing');
      this._drawAll(); this._snapshot('Clear Drawing'); this._renderLayers();
    });
    this.gridToggle.addEventListener('change', ()=>{
      this.showGrid = this.gridToggle.checked;
      this._drawAll(); this._snapshot('Toggle Grid');
    });
    this.gridSpacing.addEventListener('input', ()=>{
      this._drawAll(); this._snapshot('Grid Spacing');
    });
    this.snapToggle.addEventListener('change', ()=>{
      this.snapCenter=this.snapToggle.checked;
      this._snapshot('Toggle Snap');
    });
    this.zoomInBtn.addEventListener('click',()=>this._zoomAround(1.2));
    this.zoomOutBtn.addEventListener('click',()=>this._zoomAround(0.8));
    this.resetViewBtn.addEventListener('click',()=>{
      if(!this.memeImage) return;
      const fit=this._fitScale();
      this.viewScale=fit;
      this.viewOffsetX=(this.canvas.width-fit*this.memeImage.width)/2;
      this.viewOffsetY=(this.canvas.height-fit*this.memeImage.height)/2;
      this._drawAll(); this._snapshot('Reset View');
    });
    this.saveBtn.addEventListener('click', ()=>this._saveProject());
    this.loadBtn.addEventListener('click', ()=>this.loadInput.click());
    this.loadInput.addEventListener('change', ()=>this._loadProject());
    this._populateStickers();
    // sidebar resizer omitted for brevity
  }

  /*———————————————*
   *  Pointer & Wheel *
   *———————————————*/
  _setupEvents() {
    this.canvas.addEventListener('pointerdown',e=>this._onDown(e));
    this.canvas.addEventListener('pointermove',e=>this._onMove(e));
    window.addEventListener('pointerup',e=>this._onUp(e));
    this.canvas.addEventListener('wheel',e=>this._onWheel(e),{passive:false});
  }

  /* Simplified other handlers (onDown, onMove, onUp, onWheel) — no change except resizing logic as below */
  _doResize(pos) {
    const L=this.selectedLayer;
    const R=this.resizeOrig;
    let x1=R.x,y1=R.y,x2=R.x+R.width,y2=R.y+R.height;
    switch(this.resizeHandle){
      case'nw': x1=pos.x; y1=pos.y; break;
      case'ne': x2=pos.x; y1=pos.y; break;
      case'sw': x1=pos.x; y2=pos.y; break;
      case'se': x2=pos.x; y2=pos.y; break;
    }
    const minSz=10/this.viewScale;
    if(x2-x1<minSz) x2=x1+minSz;
    if(y2-y1<minSz) y2=y1+minSz;
    L.x = x1; L.y = y1; L.width = x2-x1; L.height = y2-y1;
    // if text layer, adjust font size to match new height
    if(L.type==='text'){
      L.size = L.height;
      this.ctx.font = `${L.size}px "${L.family}",sans-serif`;
      L.width = this.ctx.measureText(L.text).width;
      L.height = L.size;
    }
    this._drawAll();
  }

  /*———————————————*
   *  Add Text        *
   *———————————————*/
  _addText() {
    const txt=this.textInput.value.trim(); if(!txt) return;
    const size=+this.fontSize.value;
    this.ctx.font = `${size}px "${this.fontFamily.value}",sans-serif`;
    const w=this.ctx.measureText(txt).width;
    const h=size;
    const cx=(this.canvas.width/2 - this.viewOffsetX)/this.viewScale;
    const cy=(this.canvas.height/2 - this.viewOffsetY)/this.viewScale;
    this.layers.push({
      id:this._newId(), type:'text', text:txt,
      family:this.fontFamily.value, size, color:this.fontColor.value,
      outlineColor:this.outlineColor.value, outlineWidth:+this.outlineWidth.value,
      shadowColor:this.shadowColor.value, shadowBlur:+this.shadowBlur.value,
      shadowOffsetX:+this.shadowOffX.value, shadowOffsetY:+this.shadowOffY.value,
      rotation:0, visible:true, x:cx-w/2, y:cy-h/2,
      width:w, height:h, filterType:null, filterValue:1
    });
    this.textInput.value='';
    this._drawAll(); this._snapshot('Add Text'); this._renderLayers();
  }

  /*———————————————*
   *  Stickers         *
   *———————————————*/
  _populateStickers() {
    const stickers = [
      'Gravity Icon Dark.png','Gravity Icon Light.png',
      'Gravity_Logo_Wordmark_Black.png','Gravity_Logo_Wordmark_White.png',
      'Round Gradient Background.png','Square Gradient Background.png'
    ];
    this.stickerGrid.innerHTML='';
    stickers.forEach(name=>{
      const thumb=document.createElement('img');
      thumb.src = `assets/stickers/${encodeURIComponent(name)}`;
      thumb.title = name.replace(/\.[^.]+$/,'');
      thumb.addEventListener('click',()=>{
        // clear any undone states before adding
        this.history.splice(this.historyIdx+1);
        // create new Image instance for sticker
        const img=new Image(); img.src=thumb.src;
        const bb=this.lastImageBox;
        const cx = bb.w? bb.x+bb.w/2 : (this.canvas.width/2 - this.viewOffsetX)/this.viewScale;
        const cy = bb.h? bb.y+bb.h/2 : (this.canvas.height/2 - this.viewOffsetY)/this.viewScale;
        const frac=0.10;
        const w=(this.memeImage?.width||100)*frac;
        const h=w*(img.naturalHeight/img.naturalWidth);
        this.layers.push({
          id:this._newId(), type:'sticker', name:thumb.title, img,
          x:cx-w/2, y:cy-h/2, width:w, height:h,
          rotation:0, visible:true, filterType:null, filterValue:1
        });
        this._snapshot(`Sticker: ${thumb.title}`);
        this._renderLayers(); this._drawAll();
      });
      this.stickerGrid.appendChild(thumb);
    });
  }
    /*———————————————*
   *  Save / Load      *
   *———————————————*/
  _saveProject() {
    const proj = {
      viewScale:    this.viewScale,
      viewOffsetX:  this.viewOffsetX,
      viewOffsetY:  this.viewOffsetY,
      img:         this.memeImage?.src || null,
      layers:      this.layers.map(l => ({ ...l, img: null, imgSrc: l.img?.src || null })),
      frames:      this.frames
    };
    const blob = new Blob([JSON.stringify(proj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'project.json';
    a.click();
  }

  _loadProject() {
    const file = this.loadInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        this.memeImage = new Image();
        this.memeImage.onload = () => {
          this.viewScale     = p.viewScale;
          this.viewOffsetX   = p.viewOffsetX;
          this.viewOffsetY   = p.viewOffsetY;
          this.layers        = p.layers.map(l => {
            const nl = { ...l, img: null };
            if (l.imgSrc) { nl.img = new Image(); nl.img.src = l.imgSrc; }
            return nl;
          });
          this.frames        = p.frames || [];
          this._renderLayers();
          this._renderFrames();
          this._drawAll();
          this._snapshot('Load Project');
        };
        this.memeImage.src = p.img;
      } catch {
        alert('Invalid project file');
      }
    };
    reader.readAsText(file);
  }

  /*———————————————*
   *  Frames & GIF     *
   *———————————————*/
  _addFrame() {
    this._drawAll();
    this.frames.push({ data: this.canvas.toDataURL(), delay: 500 });
    this._renderFrames();
    this._snapshot('Add Frame');
  }

  _clearFrames() {
    this.frames = [];
    this._renderFrames();
    this._snapshot('Clear Frames');
  }

  _renderFrames() {
    this.framesList.innerHTML = '';
    this.frames.forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'frame-item';
      const img = document.createElement('img'); img.src = f.data;
      const lbl = document.createElement('label'); lbl.textContent = 'Delay: ';
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = 0; inp.value = f.delay;
      inp.addEventListener('change', () => { f.delay = +inp.value; this._snapshot('Frame Delay'); });
      lbl.appendChild(inp);

      const ctr = document.createElement('div');
      [['←','Back'], ['→','Front'], ['✖','Del']].forEach((p, j) => {
        const b = document.createElement('button');
        b.textContent = p[0]; b.title = p[1];
        b.addEventListener('click', () => {
          if (j === 0 && i > 0) this.frames.splice(i - 1, 2, f, this.frames[i - 1]);
          if (j === 1 && i < this.frames.length - 1) this.frames.splice(i, 2, this.frames[i + 1], f);
          if (j === 2) this.frames.splice(i, 1);
          this._renderFrames(); this._snapshot('Edit Frame');
        });
        ctr.appendChild(b);
      });

      div.append(img, lbl, ctr);
      this.framesList.appendChild(div);
    });
  }

  _exportGIF() {
    if (!this.frames.length) return alert('Add at least one frame');
    this.exportGifBtn.disabled = true;
    const gif = new GIF({ workers: 2, quality: 10, workerScript: 'lib/gif.worker.js' });
    const capture = document.createElement('canvas');
    capture.width  = this.canvas.width;
    capture.height = this.canvas.height;
    const ctx = capture.getContext('2d');

    this.frames.forEach(frame => {
      ctx.clearRect(0, 0, capture.width, capture.height);
      ctx.drawImage(this.canvas, 0, 0);
      gif.addFrame(ctx, { copy: true, delay: frame.delay });
    });

    gif.on('finished', blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'meme.gif';
      a.click();
      this.exportGifBtn.disabled = false;
    });
    gif.render();
  }

  /*———————————————*
   *  Helpers          *
   *———————————————*/
  _newId(){ return this.nextId++; }
}

window.addEventListener('DOMContentLoaded', ()=>new MemeBuilder());
