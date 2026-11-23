const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9227;
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
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(msg.error);
          else cb.resolve(msg.result);
        }
      };
    });
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
    await wait(1800);
    const targets = await httpGet(`http://127.0.0.1:${PORT}/json/list`);
    const pages = JSON.parse(targets);
    let target = pages.find(p => p.type === 'page') || pages[0];

    const cdp = new SimpleCDP(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('Navigating to http://localhost:3000/#tenant-super-admin/overview?id=ten_sst');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/#tenant-super-admin/overview?id=ten_sst' });
    await wait(1500);

    // 1. Light Mode
    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('qrew_ui_theme', 'light');
        if (window.Qrew && window.Qrew.shell && window.Qrew.shell.applyAppearanceSettings) {
          window.Qrew.shell.applyAppearanceSettings();
        }
      `
    });
    await wait(600);

    const lightShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'tenant_super_admin_overview_light.png'), Buffer.from(lightShot.data, 'base64'));
    console.log('Saved tenant_super_admin_overview_light.png');

    // 2. Dark Mode
    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('qrew_ui_theme', 'dark');
        if (window.Qrew && window.Qrew.shell && window.Qrew.shell.applyAppearanceSettings) {
          window.Qrew.shell.applyAppearanceSettings();
        }
      `
    });
    await wait(600);

    const darkShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'tenant_super_admin_overview_dark.png'), Buffer.from(darkShot.data, 'base64'));
    console.log('Saved tenant_super_admin_overview_dark.png');

    cdp.close();
    console.log('All tenant super admin screenshots captured!');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    chromeProc.kill();
  }
}

run();
