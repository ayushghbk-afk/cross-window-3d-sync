export class WindowManager {
  constructor() {
    this.id = 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.windows = new Map();
    this.channel = null;
    this.onUpdate = null;
    this.timers = { heartbeat: null, cleanup: null, move: null };
    
    document.getElementById('window-id').textContent = 'Window: ' + this.id.slice(-8);
    this.init();
  }

  getBounds() {
    return {
      id: this.id,
      x: window.screenX || window.screenLeft || 0,
      y: window.screenY || window.screenTop || 0,
      width: window.outerWidth,
      height: window.outerHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      time: Date.now()
    };
  }

  init() {
    try {
      this.channel = new BroadcastChannel('xwindow-3d');
      this.channel.onmessage = (e) => {
        const d = e.data;
        if (d?.id && d.id !== this.id) {
          d.disconnected ? this.windows.delete(d.id) : this.windows.set(d.id, d);
          this.notify();
        }
      };
      
      window.addEventListener('resize', () => this.broadcast());
      
      const onMove = () => {
        if (!this.timers.move) {
          this.timers.move = setTimeout(() => {
            this.broadcast();
            this.timers.move = null;
          }, 150);
        }
      };
      window.addEventListener('move', onMove);
      
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.broadcast();
      });
      
      setTimeout(() => this.broadcast(), 200);
      this.timers.heartbeat = setInterval(() => this.broadcast(), 3000);
      this.timers.cleanup = setInterval(() => this.cleanStale(), 6000);
      window.addEventListener('beforeunload', () => this.dispose());
      
    } catch (e) {
      console.warn('BroadcastChannel unavailable, sync disabled');
    }
  }

  broadcast() {
    const bounds = this.getBounds();
    this.windows.set(bounds.id, bounds);
    this.channel?.postMessage(bounds);
    this.notify();
  }

  cleanStale() {
    const now = Date.now();
    let changed = false;
    for (const [id, w] of this.windows) {
      if (id !== this.id && now - w.time > 10000) {
        this.windows.delete(id);
        changed = true;
      }
    }
    if (changed) this.notify();
  }

  notify() {
    document.getElementById('connection-count').textContent = 
      'Connected: ' + Math.max(1, this.windows.size);
    this.onUpdate?.(Array.from(this.windows.values()));
  }

  dispose() {
    this.channel?.postMessage({ id: this.id, disconnected: true, time: Date.now() });
    this.channel?.close();
    Object.values(this.timers).forEach(clearInterval);
    clearTimeout(this.timers.move);
  }
}
