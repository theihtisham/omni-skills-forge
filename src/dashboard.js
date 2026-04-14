import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const CATEGORY_ICONS = {
  'ai-ml': '🧠', 'web-dev': '🌐', 'backend': '⚙️', 'frontend': '🎨', 'devops': '🚀',
  'database': '🗄️', 'cloud': '☁️', 'security': '🔐', 'mobile': '📱', 'game-dev': '🎮',
  'data-science': '📊', 'blockchain': '⛓️', 'systems': '🔧', 'testing': '🧪',
  'architecture': '🏗️', 'performance': '⚡', 'api': '🔌', 'networking': '🌍',
  'embedded': '🤖', 'desktop': '🖥️', 'devtools': '🛠️', 'sre': '📈',
  'languages': '📝', 'infra': '🏗️', 'observability': '👁️', 'compliance': '📋',
  'quantum': '⚛️', 'iot': '📡',
};

const DIFFICULTY_COLORS = {
  beginner: { bg: '#10b981', text: '#ffffff' },
  intermediate: { bg: '#3b82f6', text: '#ffffff' },
  advanced: { bg: '#f59e0b', text: '#000000' },
  expert: { bg: '#ef4444', text: '#ffffff' },
};

export class OmniDashboard {
  constructor(registry) {
    this.registry = registry;
  }

  async generate(opts = {}) {
    const spinner = ora('Generating AI-powered dashboard...').start();
    const reg = this.registry;
    const categories = this._buildCategoryData(reg);
    const topSkills = reg.skills.slice(0, 200);
    const tags = this._buildTagCloud(reg);
    const diffStats = this._buildDiffStats(reg);
    const outputPath = opts.output || path.join(process.cwd(), 'osf-dashboard.html');

    const html = this._renderHTML({
      totalSkills: reg.skills.length,
      totalCategories: Object.keys(categories).length,
      categories,
      topSkills,
      tags,
      diffStats,
      generatedAt: new Date().toISOString(),
    });

    fs.writeFileSync(outputPath, html);
    spinner.succeed(chalk.green(`Dashboard generated: ${outputPath}`));
    return outputPath;
  }

  _buildCategoryData(reg) {
    const cats = {};
    for (const s of reg.skills) {
      const cat = (s.category || 'uncategorized').split('/')[0];
      if (!cats[cat]) cats[cat] = { count: 0, skills: [] };
      cats[cat].count++;
      if (cats[cat].skills.length < 12) {
        cats[cat].skills.push(s);
      }
    }
    return cats;
  }

  _buildTagCloud(reg) {
    const tags = {};
    for (const s of reg.skills) {
      for (const t of (s.tags || [])) {
        tags[t] = (tags[t] || 0) + 1;
      }
    }
    return Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 100);
  }

  _buildDiffStats(reg) {
    const stats = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
    for (const s of reg.skills) {
      if (stats[s.difficulty] !== undefined) stats[s.difficulty]++;
    }
    return stats;
  }

  _renderHTML(data) {
    const categoryCards = Object.entries(data.categories)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([cat, info]) => {
        const icon = CATEGORY_ICONS[cat] || '📁';
        const skillItems = info.skills.map(s => `
          <div class="skill-card" data-name="${this._esc(s.name)}" data-cat="${this._esc(cat)}" data-diff="${this._esc(s.difficulty || '')}" data-tags="${this._esc((s.tags || []).join(','))}">
            <div class="skill-name">${this._esc(s.name)}</div>
            <div class="skill-desc">${this._esc((s.description || '').substring(0, 100))}</div>
            <span class="badge badge-${s.difficulty || 'beginner'}">${s.difficulty || 'N/A'}</span>
            <button class="install-btn" onclick="copyInstall('${this._esc(s.name)}')">Copy Install Cmd</button>
          </div>
        `).join('');

        return `
          <div class="category-section" id="cat-${this._esc(cat)}">
            <div class="category-header" onclick="toggleCategory('${this._esc(cat)}')">
              <span class="cat-icon">${icon}</span>
              <span class="cat-name">${this._esc(cat)}</span>
              <span class="cat-count">${info.count.toLocaleString()} skills</span>
              <span class="cat-toggle" id="toggle-${this._esc(cat)}">▼</span>
            </div>
            <div class="category-skills" id="skills-${this._esc(cat)}">
              <div class="skills-grid">${skillItems}</div>
              ${info.count > 12 ? `<div class="show-more">+ ${(info.count - 12).toLocaleString()} more skills — <code>osf install --category ${this._esc(cat)}</code></div>` : ''}
            </div>
          </div>
        `;
      }).join('');

    const tagCloud = data.tags.map(([tag, count]) =>
      `<span class="tag-item" style="font-size:${Math.min(14 + count / 100, 28)}px" onclick="filterByTag('${this._esc(tag)}')">${this._esc(tag)} <sup>${count}</sup></span>`
    ).join(' ');

    const diffBars = Object.entries(data.diffStats).map(([level, count]) => {
      const pct = ((count / data.totalSkills) * 100).toFixed(1);
      return `<div class="diff-row">
        <span class="diff-label">${level}</span>
        <div class="diff-bar-bg"><div class="diff-bar diff-bar-${level}" style="width:${pct}%"></div></div>
        <span class="diff-count">${count.toLocaleString()} (${pct}%)</span>
      </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Omni Skills Forge — ${data.totalSkills.toLocaleString()} AI Agent Skills</title>
<meta property="og:title" content="Omni Skills Forge — ${data.totalSkills.toLocaleString()} Expert AI Skills">
<meta property="og:description" content="The largest open-source library of AI agent skills for Claude Code, Kilo, Cline, Cursor, Windsurf & more">
<meta name="description" content="50,000+ expert AI agent skills — single-click install for Claude Code, Kilo, Cline, Opencode, Cursor & Windsurf">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0a0a0f;--surface:#12121a;--surface2:#1a1a2e;--border:#2a2a3e;
  --text:#e2e8f0;--text2:#94a3b8;--accent:#6366f1;--accent2:#8b5cf6;
  --green:#10b981;--blue:#3b82f6;--yellow:#f59e0b;--red:#ef4444;
  --gradient:linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa,#c084fc);
}
body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,-apple-system,sans-serif;line-height:1.6;overflow-x:hidden}
.ai-bg{position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;overflow:hidden}
.ai-orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.15;animation:float 20s ease-in-out infinite}
.ai-orb:nth-child(1){width:600px;height:600px;background:var(--accent);top:-200px;left:-100px;animation-delay:0s}
.ai-orb:nth-child(2){width:500px;height:500px;background:var(--accent2);bottom:-150px;right:-100px;animation-delay:-7s}
.ai-orb:nth-child(3){width:400px;height:400px;background:var(--green);top:50%;left:50%;animation-delay:-14s}
@keyframes float{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(50px,-30px) scale(1.1)}50%{transform:translate(-30px,50px) scale(.9)}75%{transform:translate(40px,20px) scale(1.05)}}

.container{max-width:1400px;margin:0 auto;padding:0 24px}

/* Hero */
.hero{padding:80px 0 40px;text-align:center;position:relative}
.hero-badge{display:inline-block;padding:6px 16px;border-radius:999px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);color:var(--accent);font-size:14px;font-weight:600;margin-bottom:20px;animation:pulse 3s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4)}50%{box-shadow:0 0 0 12px rgba(99,102,241,0)}}
.hero h1{font-size:clamp(2.5rem,6vw,4.5rem);font-weight:900;background:var(--gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:16px;line-height:1.1}
.hero p{font-size:1.25rem;color:var(--text2);max-width:700px;margin:0 auto 32px}

/* Stats */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:48px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;text-align:center;transition:transform .2s,box-shadow .2s}
.stat-card:hover{transform:translateY(-4px);box-shadow:0 8px 32px rgba(99,102,241,.15)}
.stat-number{font-size:2.5rem;font-weight:900;background:var(--gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.stat-label{color:var(--text2);font-size:14px;margin-top:4px}

/* Tools */
.tools-row{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:48px}
.tool-chip{padding:8px 20px;border-radius:999px;font-size:14px;font-weight:600;border:1px solid var(--border);background:var(--surface);transition:all .2s}
.tool-chip:hover{border-color:var(--accent);background:rgba(99,102,241,.1)}

/* Search */
.search-section{margin-bottom:40px}
.search-box{width:100%;max-width:600px;margin:0 auto;display:block;padding:16px 24px;border-radius:16px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:16px;outline:none;transition:border-color .2s}
.search-box:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(99,102,241,.15)}
.search-box::placeholder{color:var(--text2)}

/* Tabs */
.tabs{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
.tab{padding:8px 20px;border-radius:999px;background:var(--surface);border:1px solid var(--border);color:var(--text2);cursor:pointer;font-size:14px;font-weight:500;transition:all .2s}
.tab:hover,.tab.active{background:var(--accent);color:#fff;border-color:var(--accent)}

/* Diff bars */
.diff-chart{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:40px}
.diff-row{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.diff-label{width:100px;text-align:right;font-weight:600;font-size:14px}
.diff-bar-bg{flex:1;height:24px;background:var(--surface2);border-radius:12px;overflow:hidden}
.diff-bar{height:100%;border-radius:12px;transition:width 1s ease-out}
.diff-bar-beginner{background:var(--green)}.diff-bar-intermediate{background:var(--blue)}
.diff-bar-advanced{background:var(--yellow)}.diff-bar-expert{background:var(--red)}
.diff-count{width:120px;font-size:13px;color:var(--text2)}

/* Tag cloud */
.tag-cloud{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:40px;text-align:center;line-height:2.2}
.tag-item{display:inline-block;padding:4px 12px;margin:3px;border-radius:8px;background:var(--surface2);color:var(--text);cursor:pointer;transition:all .2s;border:1px solid transparent}
.tag-item:hover{border-color:var(--accent);background:rgba(99,102,241,.1)}

/* Category sections */
.category-section{margin-bottom:8px;border-radius:16px;overflow:hidden;border:1px solid var(--border)}
.category-header{display:flex;align-items:center;padding:16px 24px;background:var(--surface);cursor:pointer;transition:background .2s;gap:12px}
.category-header:hover{background:var(--surface2)}
.cat-icon{font-size:24px}.cat-name{font-weight:700;flex:1;font-size:16px}
.cat-count{color:var(--text2);font-size:14px;margin-right:12px}
.cat-toggle{color:var(--text2);transition:transform .3s}
.category-skills{display:none;padding:16px 24px;background:var(--surface)}
.category-skills.open{display:block}
.skills-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.show-more{padding:16px 0;color:var(--text2);font-size:14px;text-align:center}
.show-more code{background:var(--surface2);padding:2px 8px;border-radius:4px;color:var(--accent)}

/* Skill cards */
.skill-card{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;transition:all .2s;position:relative}
.skill-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 20px rgba(99,102,241,.1)}
.skill-card.hidden{display:none}
.skill-name{font-weight:700;font-size:13px;margin-bottom:6px;word-break:break-word;line-height:1.3}
.skill-desc{font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.4}
.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;margin-right:6px}
.badge-beginner{background:rgba(16,185,129,.2);color:var(--green)}
.badge-intermediate{background:rgba(59,130,246,.2);color:var(--blue)}
.badge-advanced{background:rgba(245,158,11,.2);color:var(--yellow)}
.badge-expert{background:rgba(239,68,68,.2);color:var(--red)}
.install-btn{margin-top:8px;padding:4px 12px;border-radius:8px;border:1px solid var(--accent);background:transparent;color:var(--accent);font-size:11px;cursor:pointer;transition:all .2s}
.install-btn:hover{background:var(--accent);color:#fff}

/* Quick Install */
.quick-install{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:40px;text-align:center}
.quick-install h3{font-size:18px;margin-bottom:16px;color:var(--text)}
.code-blocks{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.code-block{background:#000;border:1px solid var(--border);border-radius:12px;padding:12px 20px;font-family:'Cascadia Code',Consolas,monospace;font-size:13px;color:var(--green);cursor:pointer;transition:all .2s;position:relative}
.code-block:hover{border-color:var(--accent)}
.code-block .copy-hint{position:absolute;top:-24px;left:50%;transform:translateX(-50%);font-size:11px;color:var(--text2);opacity:0;transition:opacity .2s}
.code-block:hover .copy-hint{opacity:1}

/* Footer */
.footer{text-align:center;padding:40px 0;color:var(--text2);font-size:14px;border-top:1px solid var(--border);margin-top:40px}
.footer a{color:var(--accent);text-decoration:none}
.footer a:hover{text-decoration:underline}

/* Responsive */
@media(max-width:768px){
  .hero h1{font-size:2rem}
  .skills-grid{grid-template-columns:1fr}
  .code-blocks{flex-direction:column}
  .stats-grid{grid-template-columns:repeat(2,1fr)}
}

/* Animations */
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeIn .6s ease-out forwards}
</style>
</head>
<body>

<div class="ai-bg">
  <div class="ai-orb"></div>
  <div class="ai-orb"></div>
  <div class="ai-orb"></div>
</div>

<div class="container">
  <!-- Hero -->
  <div class="hero fade-in">
    <div class="hero-badge">⚡ OPEN SOURCE · MIT LICENSE</div>
    <h1>Omni Skills Forge</h1>
    <p>The world's largest open-source library of expert AI agent skills. One command to supercharge every AI coding tool.</p>
    <div class="tools-row">
      <span class="tool-chip">🟠 Claude Code</span>
      <span class="tool-chip">🔵 Kilo</span>
      <span class="tool-chip">🟣 Cline</span>
      <span class="tool-chip">🟢 Opencode</span>
      <span class="tool-chip">🟡 Cursor</span>
      <span class="tool-chip">🔷 Windsurf</span>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid fade-in" style="animation-delay:.1s">
    <div class="stat-card"><div class="stat-number">${data.totalSkills.toLocaleString()}</div><div class="stat-label">Total Skills</div></div>
    <div class="stat-card"><div class="stat-number">${data.totalCategories}</div><div class="stat-label">Categories</div></div>
    <div class="stat-card"><div class="stat-number">6</div><div class="stat-label">AI Tools</div></div>
    <div class="stat-card"><div class="stat-number">4</div><div class="stat-label">Difficulty Levels</div></div>
  </div>

  <!-- Quick Install -->
  <div class="quick-install fade-in" style="animation-delay:.2s">
    <h3>Quick Install</h3>
    <div class="code-blocks">
      <div class="code-block" onclick="copyCmd(this)"><span class="copy-hint">Click to copy</span>npx omni-skills-forge install --all</div>
      <div class="code-block" onclick="copyCmd(this)"><span class="copy-hint">Click to copy</span>npm i -g omni-skills-forge && osf install --all</div>
    </div>
  </div>

  <!-- Search -->
  <div class="search-section fade-in" style="animation-delay:.3s">
    <input type="text" class="search-box" id="search" placeholder="Search 50,000+ skills..." oninput="filterSkills()">
  </div>

  <!-- Tabs -->
  <div class="tabs fade-in" style="animation-delay:.35s">
    <div class="tab active" onclick="showSection('categories',this)">📂 Categories</div>
    <div class="tab" onclick="showSection('tags',this)">🏷️ Tags</div>
    <div class="tab" onclick="showSection('difficulty',this)">📊 Difficulty</div>
  </div>

  <!-- Difficulty Chart -->
  <div id="section-difficulty" class="diff-chart fade-in" style="display:none">
    <h3 style="margin-bottom:16px;font-size:18px">Skills by Difficulty</h3>
    ${diffBars}
  </div>

  <!-- Tag Cloud -->
  <div id="section-tags" class="tag-cloud fade-in" style="display:none">
    <h3 style="margin-bottom:16px;font-size:18px">Popular Tags</h3>
    ${tagCloud}
  </div>

  <!-- Categories -->
  <div id="section-categories" class="fade-in" style="animation-delay:.4s">
    ${categoryCards}
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Omni Skills Forge v2.1.1 · Built with ❤️ by <a href="https://github.com/theihtisham">theihtisham</a></p>
    <p style="margin-top:8px"><a href="https://www.npmjs.com/package/omni-skills-forge">npm</a> · <a href="https://github.com/theihtisham/omni-skills-forge">GitHub</a> · Generated ${data.generatedAt}</p>
  </div>
</div>

<script>
function toggleCategory(cat){
  const el=document.getElementById('skills-'+cat);
  const tog=document.getElementById('toggle-'+cat);
  el.classList.toggle('open');
  tog.textContent=el.classList.contains('open')?'▲':'▼';
}
function filterSkills(){
  const q=document.getElementById('search').value.toLowerCase();
  document.querySelectorAll('.skill-card').forEach(c=>{
    const name=c.dataset.name.toLowerCase();
    const tags=c.dataset.tags.toLowerCase();
    const cat=c.dataset.cat.toLowerCase();
    const desc=c.querySelector('.skill-desc').textContent.toLowerCase();
    c.classList.toggle('hidden',q&&!name.includes(q)&&!tags.includes(q)&&!cat.includes(q)&&!desc.includes(q));
  });
  document.querySelectorAll('.category-skills').forEach(s=>{if(q)s.classList.add('open')});
}
function copyInstall(name){
  navigator.clipboard.writeText('osf install --skill "'+name+'"');
  const btn=event.target;btn.textContent='Copied!';btn.style.background='var(--accent)';btn.style.color='#fff';
  setTimeout(()=>{btn.textContent='Copy Install Cmd';btn.style.background='';btn.style.color='';},2000);
}
function copyCmd(el){
  navigator.clipboard.writeText(el.textContent.trim());
  el.style.borderColor='var(--green)';setTimeout(()=>el.style.borderColor='',1500);
}
function showSection(id,tab){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  tab.classList.add('active');
  ['categories','tags','difficulty'].forEach(s=>{
    const el=document.getElementById('section-'+s);
    if(el)el.style.display=s===id?'':'none';
  });
}
function filterByTag(tag){
  document.getElementById('search').value=tag;
  filterSkills();
  showSection('categories',document.querySelector('.tab'));
}
// Auto-open first category
setTimeout(()=>toggleCategory(Object.keys(${JSON.stringify(Object.keys(data.categories))})[0]),500);
</script>
</body>
</html>`;
  }

  _esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}
