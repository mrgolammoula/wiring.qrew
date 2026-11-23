const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;
const ARTIFACT_DIR = 'C:\\Users\\munir\\.gemini\\antigravity\\brain\\9ff53dfa-6af4-4559-9af4-35c9df6df063';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    const WebSocket = await this.getWebSocket();
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(msg.error);
          else cb.resolve(msg.result);
        }
      });
    });
  }

  async getWebSocket() {
    try {
      return require('ws');
    } catch (e) {
      const globalWsPath = path.join(process.env.APPDATA, 'npm/node_modules/ws');
      return require(globalWsPath);
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900'
  ]);

  try {
    await wait(1500);
    const versionInfo = await httpGet(`http://127.0.0.1:${PORT}/json/version`);
    const { webSocketDebuggerUrl } = JSON.parse(versionInfo);
    
    const targets = await httpGet(`http://127.0.0.1:${PORT}/json/list`);
    const pages = JSON.parse(targets);
    let target = pages.find(p => p.type === 'page') || pages[0];

    const cdp = new SimpleCDP(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // 1. Navigate to Profile Appearance Tab
    console.log('Navigating to http://localhost:3000/#profile?tab=appearance');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/#profile?tab=appearance' });
    await wait(1200);

    // Capture dark mode screenshot
    let shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'appearance_secondary_color_dark.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved appearance_secondary_color_dark.png');

    // Test clicking Purple swatch
    console.log('Clicking Purple secondary color...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const purpleBtn = document.querySelector('.accent-swatch-item[data-accent="#7C3AED"]');
        if (purpleBtn) purpleBtn.click();
      `
    });
    await wait(600);

    shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'appearance_secondary_purple_active.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved appearance_secondary_purple_active.png');

    // Check CSS properties on :root
    const evalResult = await cdp.send('Runtime.evaluate', {
      expression: `
        JSON.stringify({
          secondary: getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim(),
          accent: getComputedStyle(document.documentElement).getPropertyValue('--panel-accent').trim(),
          storedSecondary: localStorage.getItem('qrew_ui_secondary')
        })
      `,
      returnByValue: true
    });
    console.log('Computed styles with purple:', evalResult.result.value);

    // Switch theme to Light mode to verify light mode rendering
    await cdp.send('Runtime.evaluate', {
      expression: `
        const lightCard = document.querySelector('.appearance-theme-card[data-theme="light"]');
        if (lightCard) lightCard.click();
      `
    });
    await wait(600);

    shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'appearance_secondary_color_light.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved appearance_secondary_color_light.png');

    // Test clicking "Default (Panel Preset)"
    console.log('Clicking Default (Panel Preset)...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const defaultBtn = document.querySelector('.accent-swatch-item[data-accent="default"]');
        if (defaultBtn) defaultBtn.click();
      `
    });
    await wait(600);

    shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'appearance_secondary_default_preset.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved appearance_secondary_default_preset.png');

    // Restore dark mode for consistency
    await cdp.send('Runtime.evaluate', {
      expression: `
        const darkCard = document.querySelector('.appearance-theme-card[data-theme="dark"]');
        if (darkCard) darkCard.click();
      `
    });
    await wait(400);

    cdp.close();
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    chromeProc.kill();
  }
}

run();
