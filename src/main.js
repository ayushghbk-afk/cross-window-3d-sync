import { WindowManager } from './WindowManager.js';
import { SceneManager } from './SceneManager.js';

/**
 * Cross-Window 3D Sync
 * Main application entry point
 */
class App {
  constructor() {
    this.windowManager = null;
    this.sceneManager = null;
    this.init();
  }

  init() {
    try {
      this.windowManager = new WindowManager();
      this.sceneManager = new SceneManager(this.windowManager);
      
      window.addEventListener('beforeunload', () => this.cleanup());
      
      console.log('✨ Cross-Window 3D Sync ready');
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError();
    }
  }

  showError() {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255,0,0,0.1); color: #f44;
      padding: 24px; border-radius: 16px;
      border: 1px solid rgba(255,0,0,0.3);
      font-family: system-ui, sans-serif;
      text-align: center; z-index: 9999;
      backdrop-filter: blur(12px); max-width: 400px;
    `;
    el.innerHTML = '⚠️ WebGL not supported<br><small>Please use a modern browser</small>';
    document.body.appendChild(el);
  }

  cleanup() {
    this.sceneManager?.dispose();
    this.windowManager?.dispose();
  }
}

document.readyState === 'loading' 
  ? document.addEventListener('DOMContentLoaded', () => new App())
  : new App();
