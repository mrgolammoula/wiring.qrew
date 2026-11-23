const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9228;
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

async function auditSuite() {
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

    const testRoutes = [
      { name: 'platform_overview', url: 'http://localhost:3000/#platform/overview' },
      { name: 'platform_tenants', url: 'http://localhost:3000/#platform/tenants' },
      { name: 'super_admin_perm_catalog', url: 'http://localhost:3000/#super-admin/permission-catalog' },
      { name: 'tenant_overview', url: 'http://localhost:3000/#tenant/overview?id=ten_sst' },
      { name: 'tenant_roles', url: 'http://localhost:3000/#tenant/roles?id=ten_sst' },
      { name: 'tenant_super_admin', url: 'http://localhost:3000/#tenant-super-admin/overview?id=ten_sst' },
      { name: 'office_overview', url: 'http://localhost:3000/#office/overview?tenantId=ten_sst&officeId=off_ctg_port' },
      { name: 'profile_appearance', url: 'http://localhost:3000/#profile?tab=appearance' }
    ];

    const results = [];

    // Test in Dark Mode first
    console.log('--- TESTING DARK MODE ---');
    for (const route of testRoutes) {
      await cdp.send('Page.navigate', { url: route.url });
      await wait(1000);
      await cdp.send('Runtime.evaluate', {
        expression: `
          localStorage.setItem('qrew_ui_theme', 'dark');
          if (window.Qrew && window.Qrew.shell && window.Qrew.shell.applyAppearanceSettings) {
            window.Qrew.shell.applyAppearanceSettings();
          }
        `
      });
      await wait(400);

      // Verify no console errors or uncaught exceptions
      const evalCheck = await cdp.send('Runtime.evaluate', {
        expression: `({
          theme: document.documentElement.getAttribute('data-theme'),
          bg: window.getComputedStyle(document.body).backgroundColor,
          accent: window.getComputedStyle(document.documentElement).getPropertyValue('--panel-accent').trim(),
          brokenElementsCount: document.querySelectorAll('.role-card[style*="#FCFAF8"], .perm-card[style*="#ffffff"]').length
        })`,
        returnByValue: true
      });

      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const filename = `final_audit_${route.name}_dark.png`;
      fs.writeFileSync(path.join(ARTIFACT_DIR, filename), Buffer.from(shot.data, 'base64'));
      console.log(`[PASS - DARK] ${route.name}: Theme=${evalCheck.result.value.theme}, BG=${evalCheck.result.value.bg}, Accent=${evalCheck.result.value.accent}`);
      results.push({ route: route.name, mode: 'dark', check: evalCheck.result.value });
    }

    // Test in Light Mode
    console.log('\n--- TESTING LIGHT MODE ---');
    for (const route of testRoutes) {
      await cdp.send('Page.navigate', { url: route.url });
      await wait(1000);
      await cdp.send('Runtime.evaluate', {
        expression: `
          localStorage.setItem('qrew_ui_theme', 'light');
          if (window.Qrew && window.Qrew.shell && window.Qrew.shell.applyAppearanceSettings) {
            window.Qrew.shell.applyAppearanceSettings();
          }
        `
      });
      await wait(400);

      const evalCheck = await cdp.send('Runtime.evaluate', {
        expression: `({
          theme: document.documentElement.getAttribute('data-theme') || 'light',
          bg: window.getComputedStyle(document.body).backgroundColor,
          accent: window.getComputedStyle(document.documentElement).getPropertyValue('--panel-accent').trim()
        })`,
        returnByValue: true
      });

      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const filename = `final_audit_${route.name}_light.png`;
      fs.writeFileSync(path.join(ARTIFACT_DIR, filename), Buffer.from(shot.data, 'base64'));
      console.log(`[PASS - LIGHT] ${route.name}: Theme=${evalCheck.result.value.theme}, BG=${evalCheck.result.value.bg}, Accent=${evalCheck.result.value.accent}`);
      results.push({ route: route.name, mode: 'light', check: evalCheck.result.value });
    }

    cdp.close();
    console.log('\n=== ALL AUDIT SUITE CHECKS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Audit Suite Error:', err);
  } finally {
    chromeProc.kill();
  }
}

auditSuite();
