// script.js — a single modular class controlling everything.
const DEBUG = false;

// later in _onMove:
if (DEBUG && this.isMoving) {
  console.log('§ Moving at', e.clientX, e.clientY);
}
console.log('🔧 stylesheet:', 
  Array.from(document.styleSheets)
    .map(ss => ss.href || ss.ownerNode.nodeName)
    .filter(x=>x)
);
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
    this.addFrameBtn   = id('add-frame-btn');
    this.clearFramesBtn= id('clear-frames-btn');
    this.framesList    = id('frames-list');
    this.exportGifBtn  = id('export-gif-btn');
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
    this.memeImage       = null;   // background
    this.layers          = [];     // stickers, text, drawings, images
    this.frames          = [];     // GIF frames
    this.history         = [];
    this.historyIdx      = -1;
    this.nextId          = 1;

    // view
    this.viewScale       = 1;
    this.viewOffsetX     = 0;
    this.viewOffsetY     = 0;
    this.minScale        = 0.1;
    this.maxScale        = 10;

    // toggles
    this.showGrid        = false;
    this.snapCenter      = false;

    // interactions
    this.isDrawing       = false;
    this.isPanning       = false;
    this.isMoving        = false;
    this.isResizing      = false;
    this.isRotating      = false;
    this.currentDraw     = null;

    // helpers
    this.panStart        = null;
    this.moveStart       = null;
    this.moveOrig        = null;
    this.resizeStart     = null;
    this.resizeOrig      = null;
    this.resizeHandle    = null;
    this.rotateStart     = null;
    this.lastImageBox    = { x:0, y:0, w:0, h:0 };
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
    this.canvas.width = width;
    this.canvas.height = height;
  
    if (this.memeImage) {
      const fit = this._fitScale();
      this.viewScale = fit;
      this.viewOffsetX = (width - this.memeImage.width * fit) / 2;
      this.viewOffsetY = (height - this.memeImage.height * fit) / 2;
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
    // Ctrl+Z / Ctrl+Y
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
    // prune future
    this.history.splice(this.historyIdx+1);
    this.history.push(snap);
    this.historyIdx = this.history.length-1;
    this._updateHistoryButtons();
  }

  _restore(idx) {
    const s = this.history[idx];
    this.viewScale   = s.viewScale;
    this.viewOffsetX = s.viewOffsetX;
    this.viewOffsetY = s.viewOffsetY;
    if (s.imgSrc) {
      this.memeImage = new Image();
      this.memeImage.onload = ()=> this._finalizeRestore(s);
      this.memeImage.src    = s.imgSrc;
    } else {
      this.memeImage = null;
      this._finalizeRestore(s);
    }
  }

  _finalizeRestore(s) {
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
    this._renderFrames();
    this._drawAll();
    this._updateHistoryButtons();
  }

  _undo() {
    if (this.historyIdx > 0) this._restore(--this.historyIdx);
  }
  _redo() {
    if (this.historyIdx < this.history.length-1) this._restore(++this.historyIdx);
  }
  _updateHistoryButtons() {
    this.undoBtn.disabled = this.historyIdx <= 0;
    this.redoBtn.disabled = this.historyIdx >= this.history.length-1;
  }

  /*———————————————*
   *  Draw Everything  *
   *———————————————*/
  _drawAll() {
    // clear
    this.ctx.save();
    this.ctx.setTransform(1,0,0,1,0,0);
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.fillStyle='#222';
    this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.restore();

    // camera
    this.ctx.save();
    this.ctx.translate(this.viewOffsetX, this.viewOffsetY);
    this.ctx.scale(this.viewScale,   this.viewScale);

    // grid
    if (this.showGrid) {
      this.ctx.strokeStyle='rgba(255,255,255,0.1)';
      const gs=+this.gridSpacing.value;
      for(let x=0;x<this.canvas.width/this.viewScale;x+=gs){
        this.ctx.beginPath(); this.ctx.moveTo(x,0); this.ctx.lineTo(x,this.canvas.height/this.viewScale); this.ctx.stroke();
      }
      for(let y=0;y<this.canvas.height/this.viewScale;y+=gs){
        this.ctx.beginPath(); this.ctx.moveTo(0,y); this.ctx.lineTo(this.canvas.width/this.viewScale,y); this.ctx.stroke();
      }
    }

    // base image
    if (this.memeImage) {
      const x0 = 0;
      const y0 = 0;
      const w0 = this.memeImage.width;
      const h0 = this.memeImage.height;
      this.ctx.drawImage(this.memeImage, x0, y0, w0, h0);
      this.lastImageBox = { x: x0, y: y0, w: w0, h: h0 };
    }

    // layers
    for (const l of this.layers) {
      if (!l.visible) continue;
      this.ctx.save();
      // per-layer filter
      this.ctx.filter = l.filterType
        ? `${l.filterType}(${l.filterValue}${l.filterType==='blur'?'px':''})`
        : 'none';

      // rotation pivot
      const cx = l.x + l.width/2, cy = l.y + l.height/2;
      if (l.rotation) {
        this.ctx.translate(cx,cy);
        this.ctx.rotate(l.rotation);
        this.ctx.translate(-cx,-cy);
      }

      if (l.type==='image' || l.type==='sticker') {
        this.ctx.drawImage(l.img, l.x, l.y, l.width, l.height);
      }
      else if (l.type==='text') {
        this.ctx.font = `${l.size}px "${l.family}",sans-serif`;
        this.ctx.textBaseline='top';
        this.ctx.fillStyle    = l.color;
        this.ctx.shadowColor  = l.shadowColor;
        this.ctx.shadowBlur   = l.shadowBlur;
        this.ctx.shadowOffsetX= l.shadowOffsetX;
        this.ctx.shadowOffsetY= l.shadowOffsetY;
        if (l.outlineWidth) {
          this.ctx.lineWidth   = l.outlineWidth;
          this.ctx.strokeStyle = l.outlineColor;
          this.ctx.strokeText(l.text,l.x,l.y);
        }
        this.ctx.fillText(l.text,l.x,l.y);
      }
      else /* drawing */ {
        this.ctx.strokeStyle = l.color;
        this.ctx.lineWidth = (l.lineWidth || 1) / this.viewScale; 
        if (l.tool==='pencil') {
          this.ctx.beginPath();
          for (let i=0;i<l.path.length;i++){
            const p=l.path[i];
            if (i===0) this.ctx.moveTo(p.x,p.y);
            else       this.ctx.lineTo(p.x,p.y);
          }
          this.ctx.stroke();
        }
        else if (l.tool==='rectangle') {
          this.ctx.strokeRect(l.x,l.y,l.width,l.height);
        }
        else /*circle*/ {
          this.ctx.beginPath();
          this.ctx.arc(l.cx,l.cy,l.r,0,Math.PI*2);
          this.ctx.stroke();
        }
      }
      this.ctx.restore();
    }

    // selection box + handles
    if (this.selectedLayer) {
      const L = this.selectedLayer;
      this.ctx.save();
    
      // dashed bounding box
      this.ctx.strokeStyle = 'yellow';
      this.ctx.lineWidth   = 2 / this.viewScale;
      this.ctx.setLineDash([6/this.viewScale, 6/this.viewScale]);
      this.ctx.strokeRect(L.x, L.y, L.width, L.height);
      this.ctx.setLineDash([]);
    
      // corner “grab” squares
      this.ctx.fillStyle = 'yellow';
      const hs = 14 / this.viewScale;
      [
        [L.x,           L.y],
        [L.x + L.width, L.y],
        [L.x,           L.y + L.height],
        [L.x + L.width, L.y + L.height]
      ].forEach(([hx, hy]) => {
        this.ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs);
      });
    
      // rotate handle (solo)—now that rx,ry exist, we can safely arc()
      const rx = L.x + L.width/2;
      const ry = L.y - 30/this.viewScale;
      this.ctx.beginPath();
      this.ctx.arc(rx, ry, 8 / this.viewScale, 0, Math.PI * 2);
      this.ctx.fill();
    
      this.ctx.restore();
    }

    this.ctx.restore();
  }
  _renderLayers() {
    this.layersList.innerHTML = '';
    this.layers.forEach((layer, idx) => {
      const div = document.createElement('div');
      div.className = 'layer-item';
  
      const name = document.createElement('input');
      name.type = 'text';
      name.value = layer.name || layer.text || layer.type;
      name.addEventListener('change', () => {
        layer.name = name.value;
        this._snapshot('Rename Layer');
      });
  
      const visible = document.createElement('input');
      visible.type = 'checkbox';
      visible.checked = layer.visible;
      visible.addEventListener('change', () => {
        layer.visible = visible.checked;
        this._drawAll(); this._snapshot('Toggle Layer Visibility');
      });
  
      const up = document.createElement('button');
      up.textContent = '↑';
      up.disabled = idx === 0;
      up.addEventListener('click', () => {
        [this.layers[idx-1], this.layers[idx]] = [this.layers[idx], this.layers[idx-1]];
        this._renderLayers(); this._drawAll(); this._snapshot('Layer Up');
      });
  
      const down = document.createElement('button');
      down.textContent = '↓';
      down.disabled = idx === this.layers.length - 1;
      down.addEventListener('click', () => {
        [this.layers[idx], this.layers[idx+1]] = [this.layers[idx+1], this.layers[idx]];
        this._renderLayers(); this._drawAll(); this._snapshot('Layer Down');
      });
  
      const del = document.createElement('button');
      del.textContent = '🗑️';
      del.addEventListener('click', () => {
        this.layers.splice(idx, 1);
        if (this.selectedLayer === layer) this.selectedLayer = null;
        this._renderLayers(); this._drawAll(); this._snapshot('Delete Layer');
      });
  
      const filterSel = document.createElement('select');
      ['none','blur','grayscale','brightness','contrast'].forEach(ft => {
        const opt = document.createElement('option');
        opt.value = ft === 'none' ? '' : ft;
        opt.textContent = ft;
        if (layer.filterType === ft) opt.selected = true;
        filterSel.appendChild(opt);
      });
      filterSel.addEventListener('change', () => {
        layer.filterType = filterSel.value || null;
        this._drawAll(); this._snapshot('Filter Change');
      });
  
      const filterVal = document.createElement('input');
      filterVal.type = 'range';
      filterVal.min = 0; filterVal.max = 100;
      filterVal.value = (layer.filterValue ?? 1) * 10;
      filterVal.addEventListener('input', () => {
        layer.filterValue = +filterVal.value / 10;
        this._drawAll(); this._snapshot('Filter Value');
      });
  
      const btns = document.createElement('div');
      btns.className = 'btns';
      btns.append(up, down, del);
  
      div.append(name, visible, filterSel, filterVal, btns);
      this.layersList.appendChild(div);
    });
  }

  /*———————————————*
   *  UI Wiring       *
   *———————————————*/
  _setupUI() {
    // collapsibles
    document.querySelectorAll('.section-header')
    .forEach(h => h.addEventListener('click', () =>
      h.parentElement.classList.toggle('open')));
    // upload images
    this.uploadInput.addEventListener('change', e=>this._onUploadImages(e));

    // text tools
    this.addTextBtn.addEventListener('click', ()=> {
      this.textTools.style.display =
        this.textTools.style.display==='none'?'flex':'none';
    });
    this.applyTextBtn.addEventListener('click', ()=>this._addText());

    // clear drawings
    this.clearDrawBtn.addEventListener('click', ()=> {
      this.layers = this.layers.filter(l=>l.type!=='drawing');
      this._drawAll(); this._snapshot('Clear Drawings');
      this._renderLayers();
    });

    // grid & snap
    this.gridToggle.addEventListener('change', ()=>{
      this.showGrid=this.gridToggle.checked;
      this._drawAll(); this._snapshot('Toggle Grid');
    });
    this.gridSpacing.addEventListener('input', ()=>{
      this._drawAll(); this._snapshot('Grid Spacing');
    });
    this.snapToggle.addEventListener('change', ()=>{
      this.snapCenter=this.snapToggle.checked;
      this._snapshot('Toggle Snap');
    });

    // zoom buttons
    this.zoomInBtn.addEventListener('click',()=>this._zoomAround(1.2));
    this.zoomOutBtn.addEventListener('click',()=>this._zoomAround(0.8));
    this.resetViewBtn.addEventListener('click',()=>{
      if(!this.memeImage) return;
      const fit=this._fitScale();
      this.viewScale=fit;
      this.viewOffsetX=(this.canvas.width-this.memeImage.width*fit)/2;
      this.viewOffsetY=(this.canvas.height-this.memeImage.height*fit)/2;
      this._drawAll(); this._snapshot('Reset View');
    });

    // save/load
    this.saveBtn.addEventListener('click', ()=>this._saveProject());
    this.loadBtn.addEventListener('click', ()=>this.loadInput.click());
    this.loadInput.addEventListener('change', ()=>this._loadProject());

    // frames & GIF
    this.addFrameBtn.addEventListener('click', ()=>this._addFrame());
    this.clearFramesBtn.addEventListener('click', ()=>this._clearFrames());
    this.exportGifBtn.addEventListener('click', ()=>this._exportGIF());

    // stickers
    this._populateStickers();

    // sidebar resizer
    this.resizer.addEventListener('pointerdown', e=>{
      this.isSidebarResizing = true;
      this.sidebarStartX = e.clientX;
      this.sidebarStartWidth = this.sidebar.offsetWidth;
      document.body.style.cursor = 'col-resize';
    });
    window.addEventListener('pointermove', e => {
      if (!this.isSidebarResizing) return;
      const dx = e.clientX - this.sidebarStartX;
      const newWidth = Math.min(Math.max(this.sidebarStartWidth + dx, 200), window.innerWidth * 0.9);
      this.sidebar.style.flexBasis = `${newWidth}px`;
    });
    window.addEventListener('pointerup', () => {
      this.isSidebarResizing = false;
      document.body.style.cursor = 'default';
    });
    document.querySelectorAll('.tool-section .resizer').forEach(resizer => {
      const section = resizer.parentElement;
    
      resizer.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = section.offsetHeight;
    
        const onMove = (e) => {
          const dy = e.clientY - startY;
          const newHeight = Math.max(80, startHeight + dy);
          section.style.height = newHeight + 'px';
        };
    
        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
        };
    
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    });
  }

  /*———————————————*
   *  Pointer + Wheel  *
   *———————————————*/
  _setupEvents() {
    this.canvas.addEventListener('pointerdown', e=>this._onDown(e));
    this.canvas.addEventListener('pointermove', e=>this._onMove(e));
    window.addEventListener('pointerup',          e => this._onUp(e));
    this.canvas.addEventListener('wheel', e=>this._onWheel(e), {passive:false});
  }

  _onDown(e) {
    e.preventDefault();
    this.isPanning = this.isMoving = this.isDrawing = false;
    const pos=this._toWorld(e);
    if (this.isSidebarResizing) return;

    // middle for pan
    if (e.button === 1 && this.toolMode.value === 'pan') {
      this.isPanning=true;
      this.panStart={x:e.clientX,y:e.clientY};
      return;
    }


    // select mode
    if (this.toolMode.value==='select') {
      // resize / rotate
      for (let i=this.layers.length-1;i>=0;i--){
        const L=this.layers[i],
              h=this._getHandle(L,pos);
        if (L.visible && h) {
          this.selectedLayer=L;
          if (h==='rot') {
            this.isRotating=true;
            const cx=L.x+L.width/2, cy=L.y+L.height/2;
            this.rotateStart=Math.atan2(pos.y-cy,pos.x-cx) - L.rotation;
          } else {
            this.isResizing=true;
            this.resizeHandle=h;
            this.resizeStart=pos;
            this.resizeOrig={...L};
            this.moveStart = pos;
            this.moveOrig = {...L};  // critical: clone!
          }
          this._renderLayers();
          return;
        }
      }
      // move
      for (let i=this.layers.length-1;i>=0;i--){
        const L=this.layers[i];
        if (L.visible && this._inLayer(L,pos)) {
          this.selectedLayer=L;
          this.isMoving=true;
          this.moveStart=pos;
          this.moveOrig={...L};
          this._renderLayers();
          return;
        }
      }
      // deselect
      if (this.selectedLayer) {
        this.selectedLayer=null;
        this._renderLayers();
        this._drawAll();
        this._snapshot('Deselect');
      }
      return;
    }

    // drawing
    this.isDrawing=true;
    this.currentDraw={
      id:this._newId(), type:'drawing', tool:this.toolMode.value,
      color:this.drawColor.value, lineWidth:+this.drawWidth.value,
      visible:true, path:[]
    };
    if (this.currentDraw.tool==='pencil') {
      this.currentDraw.path.push(pos);
    } else {
      Object.assign(this.currentDraw,{x:pos.x,y:pos.y,width:0,height:0,cx:pos.x,cy:pos.y,r:0});
    }
    this.layers.push(this.currentDraw);
  }

  _onMove(e) {
    const pos=this._toWorld(e);
    if (this.isSidebarResizing) {
      const dx=e.clientX-this.sidebarStartX;
      this.sidebar.style.width = Math.min(Math.max(this.sidebarStartWidth+dx,200),800)+'px';
      return;
    }
    if (this.isPanning) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      this.viewOffsetX += dx;
      this.viewOffsetY += dy;
      this.panStart = { x: e.clientX, y: e.clientY };
      this._drawAll();
      return;
    }
    if (this.isResizing && this.selectedLayer) {
      this._doResize(pos);
      return;
    }
    if (this.isRotating && this.selectedLayer) {
      const L=this.selectedLayer;
      const cx=L.x+L.width/2, cy=L.y+L.height/2;
      const ang=Math.atan2(pos.y-cy,pos.x-cx);
      L.rotation = ang - this.rotateStart;
      this._drawAll();
      return;
    }
    if (this.isMoving && this.selectedLayer) {
      this._doMove(pos);
      return;
    }
    if (this.isDrawing && this.currentDraw) {
      this._doDraw(pos);
      return;
    }
  }

  _onUp(e) {
    if (this.isSidebarResizing) {
      document.body.style.cursor='default';
      this.isSidebarResizing=false;
      this._snapshot('Resize Sidebar');
      return;
    }
    if (this.isPanning)   { this.isPanning=false;   this._snapshot('Pan'); }
    if (this.isMoving)    { this.isMoving=false;    this._snapshot('Move'); }
    if (this.isResizing)  { this.isResizing=false;  this._snapshot('Resize'); }
    if (this.isRotating)  { this.isRotating=false;  this._snapshot('Rotate'); }
    if (this.isDrawing)   { this.isDrawing=false;   this._snapshot('Draw'); this.currentDraw=null; }
  }

  _onWheel(e) {
    e.preventDefault();

    // 1) Canvas-relative CSS pixels:
    const rect = this.canvas.getBoundingClientRect();
    const cx   = e.clientX - rect.left;
    const cy   = e.clientY - rect.top;

    // 2) Map to world coords using current camera:
    const worldX = (cx - this.viewOffsetX) / this.viewScale;
    const worldY = (cy - this.viewOffsetY) / this.viewScale;

    // 3) Zoom in/out:
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale   = this._clampScale(this.viewScale * zoomFactor);

    // 4) Re-anchor so (worldX,worldY) stays under cursor:
    this.viewOffsetX = cx - worldX * newScale;
    this.viewOffsetY = cy - worldY * newScale;
    this.viewScale   = newScale;

    this._drawAll();
    this._snapshot('Zoom Layout-Aware');
  }

  /*———————————————*
   *  Add Text        *
   *———————————————*/
  _addText() {
    const txt = this.textInput.value.trim();
    if (!txt) return alert('Please enter text');
  
    const size = +this.fontSize.value;
    this.ctx.font = `${size}px "${this.fontFamily.value}", sans-serif`;
    const w = this.ctx.measureText(txt).width;
    const h = size;
  
    const cx = (this.canvas.width / 2 - this.viewOffsetX) / this.viewScale;
    const cy = (this.canvas.height / 2 - this.viewOffsetY) / this.viewScale;
  
    this.layers.push({
      id: this._newId(),
      type: 'text',
      text: txt,
      family: this.fontFamily.value,
      size: size,
      color: this.fontColor.value,
      outlineColor: this.outlineColor.value,
      outlineWidth: +this.outlineWidth.value,
      shadowColor: this.shadowColor.value,
      shadowBlur: +this.shadowBlur.value,
      shadowOffsetX: +this.shadowOffX.value,
      shadowOffsetY: +this.shadowOffY.value,
      rotation: 0,
      visible: true,
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      filterType: null,
      filterValue: 1,
    });
  
    this.textInput.value = '';
    this._drawAll();
    this._snapshot('Add Text');
    this._renderLayers();
  }

  /*———————————————*
   *  Move & Resize   *
   *———————————————*/
  _doMove(pos) {
    const L = this.selectedLayer;
    if (!L || !this.moveStart || !this.moveOrig) return;
  
    let dx = pos.x - this.moveStart.x;
    let dy = pos.y - this.moveStart.y;
  
    let nx = this.moveOrig.x + dx;
    let ny = this.moveOrig.y + dy;
  
    if (this.snapCenter && this.memeImage) {
      const tol = 10 / this.viewScale;
      const {x, y, w, h} = this.lastImageBox;
      const cx = x + w / 2 - L.width / 2;
      const spots = [
        { x: cx, y: y + h * 0.1 - L.height / 2 },
        { x: cx, y: y + h * 0.5 - L.height / 2 },
        { x: cx, y: y + h * 0.9 - L.height / 2 }
      ];
      spots.forEach(s => {
        if (Math.abs(nx - s.x) < tol) nx = s.x;
        if (Math.abs(ny - s.y) < tol) ny = s.y;
      });
    }
  
    // Clamp canvas movement to bounds (optional safety)
    if (this.memeImage) {
      const maxX = this.memeImage.width - L.width;
      const maxY = this.memeImage.height - L.height;
      nx = Math.max(0, Math.min(nx, maxX));
      ny = Math.max(0, Math.min(ny, maxY));
    }
  
    L.x = nx;
    L.y = ny;
    this._drawAll();
  }

  _doResize(pos) {
    const L=this.selectedLayer,
          R=this.resizeOrig,
          minSz=10/this.viewScale;
    let x1=R.x, y1=R.y, x2=R.x+R.width, y2=R.y+R.height;
    switch(this.resizeHandle){
      case'nw': x1=pos.x; y1=pos.y; break;
      case'ne': x2=pos.x; y1=pos.y; break;
      case'sw': x1=pos.x; y2=pos.y; break;
      case'se': x2=pos.x; y2=pos.y; break;
    }
    // enforce min size
    if (x2-x1<minSz) x2=x1+minSz;
    if (y2-y1<minSz) y2=y1+minSz;
    L.x=x1; L.y=y1; L.width=x2-x1; L.height=y2-y1;
    this._drawAll();
  }

  /*———————————————*
   *  Draw Mode       *
   *———————————————*/
  _doDraw(pos) {
    const d=this.currentDraw;
    if (d.tool==='pencil') d.path.push(pos);
    else if (d.tool==='rectangle') {
      d.width=pos.x-d.x; d.height=pos.y-d.y;
    } else {
      const dx=pos.x-d.cx, dy=pos.y-d.cy;
      d.r=Math.hypot(dx,dy);
    }
    this._drawAll();
  }

  /*———————————————*
  *  Upload Images    *
  *———————————————*/
  _onUploadImages(e) {
    const file = e.target.files[0];
    if (!file) return;

    // create an object URL so we don’t stomp the canvas on load
    const url = URL.createObjectURL(file);
    this.memeImage = new Image();
    this.memeImage.onload = () => {
      // Let our existing resize handler set BOTH canvas size & camera
      this._onResize();

      // And then record it
      this._snapshot('Upload Background');
    };
    this.memeImage.src = url;

// clear the input so the user can re-upload the same file if needed
    e.target.value = null;
       }
  /*———————————————*
   *  Zoom Helpers    *
   *———————————————*/
  _zoomAround(fac) {
    const cx = (this.canvas.width / 2 - this.viewOffsetX) / this.viewScale;
    const cy = (this.canvas.height / 2 - this.viewOffsetY) / this.viewScale;
  
    const wx = (cx - this.viewOffsetX) / this.viewScale;
    const wy = (cy - this.viewOffsetY) / this.viewScale;
  
    const newScale = this._clampScale(this.viewScale * fac);
    if (newScale === this.viewScale) return;
  
    this.viewOffsetX = cx - wx * newScale;
    this.viewOffsetY = cy - wy * newScale;
    this.viewScale = newScale;
  
    this._drawAll();
    this._snapshot('Zoom');
  }
  _zoomAroundCursor(factor, screenX, screenY) {
    const worldX = (screenX - this.viewOffsetX) / this.viewScale;
    const worldY = (screenY - this.viewOffsetY) / this.viewScale;
  
    const newScale = this._clampScale(this.viewScale * factor);
    if (newScale === this.viewScale) return;
  
    this.viewOffsetX = screenX - worldX * newScale;
    this.viewOffsetY = screenY - worldY * newScale;
    this.viewScale = newScale;
  
    this._drawAll();
    this._snapshot('Mouse Zoom');
  }

  /*———————————————*
   *  Save / Load      *
   *———————————————*/
  _saveProject() {
    const proj = {
      viewScale: this.viewScale,
      viewOffsetX: this.viewOffsetX,
      viewOffsetY: this.viewOffsetY,
      img: this.memeImage?.src || null,
      layers: this.layers.map(l => ({ ...l, imgSrc: l.img?.src || null, img: null })),
      frames: this.frames
    };
    const blob = new Blob([JSON.stringify(proj, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'project.json';
    a.click();
  }

  _loadProject() {
    const file = this.loadInput.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const p = JSON.parse(rd.result);
        this.memeImage = new Image();
        this.memeImage.onload = () => {
          this.viewScale = p.viewScale;
          this.viewOffsetX = p.viewOffsetX;
          this.viewOffsetY = p.viewOffsetY;
          this.layers = p.layers.map(l => {
            const nl = {...l, img: null};
            if (l.imgSrc) {
              nl.img = new Image();
              nl.img.src = l.imgSrc;
            }
            return nl;
          });
          this.frames = p.frames || [];
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
    rd.readAsText(file);
  }
  /*———————————————*
   *  Frames & GIF     *
   *———————————————*/
  _addFrame() {
    this._drawAll();
    this.frames.push({ data:this.canvas.toDataURL(), delay:500 });
    this._renderFrames();
    this._snapshot('Add Frame');
  }

  _clearFrames() {
    this.frames=[];
    this._renderFrames();
    this._snapshot('Clear Frames');
  }

  _renderFrames() {
    this.framesList.innerHTML='';
    this.frames.forEach((f,i)=>{
      const div=document.createElement('div');
      div.className='frame-item';
      const img=document.createElement('img'); img.src=f.data;
      const lbl=document.createElement('label'); lbl.textContent='Delay:';
      const inp=document.createElement('input');
      inp.type='number'; inp.min=0; inp.value=f.delay;
      inp.addEventListener('change',()=>{ f.delay=+inp.value; this._snapshot('Frame Delay'); });
      lbl.appendChild(inp);
      const ctr=document.createElement('div');
      [['←','Back'],['→','Front'],['✖','Del']].forEach((p,j)=>{
        const b=document.createElement('button');
        b.textContent=p[0]; b.title=p[1];
        b.addEventListener('click',()=>{
          if (j===0 && i>0) this.frames.splice(i-1,2, f, this.frames[i-1]);
          if (j===1 && i<this.frames.length-1) this.frames.splice(i,2,this.frames[i+1],f);
          if (j===2) this.frames.splice(i,1);
          this._renderFrames(); this._snapshot('Edit Frame');
        });
        ctr.appendChild(b);
      });
      div.append(img,lbl,ctr);
      this.framesList.appendChild(div);
    });
  }

  _exportGIF() {
    if (!this.frames.length) return alert('Add at least one frame');
    this.exportGifBtn.disabled = true;
    const g = new GIF({workers: 2, quality: 10, workerScript: 'lib/gif.worker.js'});

    const capture = document.createElement('canvas');
    capture.width = this.canvas.width;
    capture.height = this.canvas.height;
    const ctx = capture.getContext('2d');

    this.frames.forEach(f => {
      ctx.clearRect(0, 0, capture.width, capture.height);
      ctx.drawImage(this.canvas, 0, 0);
      g.addFrame(ctx, {copy: true, delay: f.delay});
    });

    g.on('finished', blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'meme.gif';
      a.click();
      this.exportGifBtn.disabled = false;
    });
    g.render();
  }

  /*———————————————*
   *  Stickers         *
   *———————————————*/
  _populateStickers() {
    // list of sticker filenames
    const stickers = [
      'Gravity Icon Dark.png',
      'Gravity Icon Light.png',
      'Gravity_Logo_Wordmark_Black.png',
      'Gravity_Logo_Wordmark_White.png',
      'Round Gradient Background.png',
      'Square Gradient Background.png'
    ];

    // clear any existing thumbnails
    this.stickerGrid.innerHTML = '';

    stickers.forEach(name => {
      const img = document.createElement('img');
      img.src   = `assets/stickers/${encodeURIComponent(name)}`;
      img.title = name.replace(/\.[^.]+$/,'');

      img.addEventListener('click', () => {
        // compute center exactly as before…
        let cx, cy;
        if (this.lastImageBox.w && this.lastImageBox.h) {
          cx = this.lastImageBox.x + this.lastImageBox.w/2;
          cy = this.lastImageBox.y + this.lastImageBox.h/2;
        } else {
          cx = (this.canvas.width/2  - this.viewOffsetX) / this.viewScale;
          cy = (this.canvas.height/2 - this.viewOffsetY) / this.viewScale;
        }
  
        // — CHANGED HERE —  
        // choose sticker to be 10% of the background’s width (in world units)
        const frac = 0.10;
        const w = (this.memeImage?.width || 100) * frac;
        const h = w * (img.naturalHeight / img.naturalWidth);
  
        this.layers.push({
          id: this._newId(),
          type: 'sticker',
          name: img.title,
          img,
          x: cx - w/2,
          y: cy - h/2,
          width:  w,
          height: h,
          rotation: 0,
          visible: true,
          filterType: null,
          filterValue: 1
        });
  
        this._snapshot(`Sticker: ${img.title}`);
        this._renderLayers();
        this._drawAll();
      });

      this.stickerGrid.appendChild(img);
    });
  }

  /*———————————————*
   *  Helpers          *
   *———————————————*/
  _newId(){ return this.nextId++; }
  _toWorld(e){
    const r=this.canvas.getBoundingClientRect();
    return {
      x:(e.clientX-r.left-this.viewOffsetX)/this.viewScale,
      y:(e.clientY-r.top -this.viewOffsetY)/this.viewScale
    };
  }
  _getHandle(L,pos){
    const tol=12/this.viewScale;
    const pts={ nw:[L.x,L.y], ne:[L.x+L.width,L.y],
                sw:[L.x,L.y+L.height], se:[L.x+L.width,L.y+L.height] };
    for(const k of Object.keys(pts)){
      const [px,py]=pts[k];
      if(Math.abs(pos.x-px)<tol && Math.abs(pos.y-py)<tol) return k;
    }
    const cx=L.x+L.width/2, cy=L.y+L.height/2 - 30/this.viewScale;
    if(Math.hypot(pos.x-cx,pos.y-cy)<tol) return 'rot';
    return null;
  }
  _inLayer(L,pos){
    return pos.x>=L.x && pos.x<=L.x+L.width &&
           pos.y>=L.y && pos.y<=L.y+L.height;
  }
}

// initialize
window.addEventListener('DOMContentLoaded', ()=> new MemeBuilder());
