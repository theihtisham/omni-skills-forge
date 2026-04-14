import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import boxen from 'boxen';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cliProgress from 'cli-progress';
import inquirer from 'inquirer';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const HOME = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;

const TOOL_CONFIGS = {
  'claude-code': { path: path.join(HOME, '.claude', 'skills'),     icon: '🟠', label: 'Claude Code', fileExt: '.md',  alwaysCreate: true },
  'kilo':        { path: path.join(HOME, '.kilo', 'skills'),        icon: '🔵', label: 'Kilo',        fileExt: '.md',  alwaysCreate: true },
  'cline':       { path: path.join(HOME, '.cline', 'skills'),       icon: '🟣', label: 'Cline',       fileExt: '.md',  alwaysCreate: true },
  'opencode':    { path: path.join(HOME, '.opencode', 'skills'),    icon: '🟢', label: 'Opencode',    fileExt: '.md',  alwaysCreate: true },
  'cursor':      { path: path.resolve(process.cwd(), '.cursor', 'rules'),   icon: '🟡', label: 'Cursor',      fileExt: '.mdc', alwaysCreate: false },
  'windsurf':    { path: path.resolve(process.cwd(), '.windsurf', 'rules'), icon: '🔷', label: 'Windsurf',    fileExt: '.md',  alwaysCreate: false },
};

export class OmniInstaller {
  constructor() {
    this._registry = null;
    this._skillsDir = path.join(PROJECT_ROOT, 'skills');
  }

  async _loadRegistry() {
    if (this._registry) return this._registry;
    const registryPath = path.join(PROJECT_ROOT, 'registry', 'master-registry.json');
    if (fs.existsSync(registryPath)) {
      try {
        this._registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      } catch {
        this._registry = this._buildRegistryInMemory();
      }
    } else {
      this._registry = this._buildRegistryInMemory();
    }
    return this._registry;
  }

  _buildRegistryInMemory() {
    const skills = [];
    const categories = new Set();
    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkDir(full);
        else if (entry.name.endsWith('.md')) {
          const content = fs.readFileSync(full, 'utf-8');
          const fm = this._parseFrontmatter(content);
          if (fm) {
            const rel = path.relative(this._skillsDir, full).replace(/\\/g, '/');
            skills.push({ name: fm.name, category: fm.category, difficulty: fm.difficulty, tags: fm.tags || [], description: fm.description || '', file: rel });
            if (fm.category) categories.add(fm.category);
          }
        }
      }
    };
    walkDir(this._skillsDir);
    return { version: '2.1.1', totalSkills: skills.length, builtAt: new Date().toISOString(), categories: [...categories], skills };
  }

  _parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const fm = {};
    for (const line of match[1].split('\n')) {
      const m = line.match(/^(\w+):\s*["']?(.*?)["']?\s*$/);
      if (m) {
        let val = m[2];
        if (val.startsWith('[') && val.endsWith(']')) {
          val = val.slice(1, -1).split(',').map(s => s.trim().replace(/["']/g, ''));
        }
        fm[m[1]] = val;
      }
    }
    return fm;
  }

  _detectTools() {
    const detected = [];
    for (const [name, cfg] of Object.entries(TOOL_CONFIGS)) {
      if (fs.existsSync(cfg.path) || fs.existsSync(path.dirname(cfg.path))) {
        detected.push(name);
      }
    }
    if (!detected.includes('claude-code')) detected.unshift('claude-code');
    return detected;
  }

  async _resolveTool(opts) {
    if (opts.tool) return opts.tool;
    const detected = this._detectTools();
    if (detected.length === 1) return detected[0];
    const { tool } = await inquirer.prompt([{
      type: 'list', name: 'tool', message: 'Select target tool:',
      choices: [
        ...detected.map(t => ({ name: `${TOOL_CONFIGS[t].icon} ${TOOL_CONFIGS[t].label}`, value: t })),
        new inquirer.Separator(),
        { name: '💻 All Tools (install to every tool above)', value: 'all-tools' },
      ]
    }]);
    return tool;
  }

  _getTools(toolChoice) {
    if (toolChoice === 'all-tools') return this._detectTools();
    return [toolChoice];
  }

  _installOneSkill(skill, tools, opts) {
    const srcFile = path.join(this._skillsDir, skill.file);
    if (!fs.existsSync(srcFile)) return false;
    const content = fs.readFileSync(srcFile, 'utf-8');
    for (const t of tools) {
      const cfg = TOOL_CONFIGS[t];
      if (!cfg) continue;
      const destDir = opts.dir || cfg.path;
      const destPath = path.join(destDir, skill.file.replace(/\.md$/, cfg.fileExt));
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      if (!opts.dryRun) fs.writeFileSync(destPath, content);
    }
    return true;
  }

  // ── SINGLE-CLICK INSTALL ALL ──
  async installAll(opts = {}) {
    const registry = await this._loadRegistry();
    const tool = await this._resolveTool(opts);
    const tools = this._getTools(tool);
    const toolNames = tools.map(t => TOOL_CONFIGS[t]?.label || t).join(', ');

    console.log('');
    console.log(boxen(
      chalk.bold.cyan(' SINGLE-CLICK INSTALL ') + '\n\n' +
      chalk.white(`${registry.skills.length.toLocaleString()} skills`) + chalk.gray(' → ') + chalk.white(toolNames),
      { padding: 1, borderColor: 'cyan', borderStyle: 'round' }
    ));
    console.log('');

    const bar = new cliProgress.SingleBar({
      format: `  ${chalk.cyan('{bar}')} {percentage}% │ {value}/{total} skills`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    }, cliProgress.Presets.shades_classic);
    bar.start(registry.skills.length, 0);

    let installed = 0;
    for (const skill of registry.skills) {
      if (this._installOneSkill(skill, tools, opts)) installed++;
      bar.increment();
    }
    bar.stop();

    console.log('');
    console.log(boxen(
      chalk.green.bold(` DONE! ${installed.toLocaleString()} skills installed `) + '\n\n' +
      chalk.gray(`Target: ${toolNames}`) + '\n' +
      chalk.gray(`Location: ${opts.dir || tools.map(t => TOOL_CONFIGS[t]?.path).join(', ')}`),
      { padding: 1, borderColor: 'green', borderStyle: 'round' }
    ));
    if (opts.dryRun) console.log(chalk.yellow('\n  (dry-run — no files were written)'));
  }

  // ── INSTALL BY CATEGORY ──
  async installCategory(category, opts = {}) {
    const registry = await this._loadRegistry();
    const tool = await this._resolveTool(opts);
    const tools = this._getTools(tool);
    const toolNames = tools.map(t => TOOL_CONFIGS[t]?.label || t).join(', ');
    const filtered = registry.skills.filter(s => s.category && (s.category === category || s.category.startsWith(category + '/')));
    if (!filtered.length) {
      console.log(chalk.yellow(`\nNo skills found in category "${category}". Run "osf categories" to see all.`));
      return;
    }
    const spinner = ora(`Installing ${filtered.length} skills from ${chalk.cyan(category)}...`).start();
    let installed = 0;
    for (const skill of filtered) {
      if (this._installOneSkill(skill, tools, opts)) installed++;
    }
    spinner.succeed(chalk.green(`Installed ${installed} skills from ${chalk.cyan(category)} → ${toolNames}`));
  }

  // ── INSTALL SINGLE SKILL ──
  async installSkill(skillName, opts = {}) {
    const registry = await this._loadRegistry();
    let skill = registry.skills.find(s => s.name === skillName);
    if (!skill) skill = registry.skills.find(s => s.name && s.name.includes(skillName));
    if (!skill) {
      console.log(chalk.red(`\nSkill "${skillName}" not found. Try: osf search "${skillName}"`));
      return;
    }
    const tool = await this._resolveTool(opts);
    const tools = this._getTools(tool);
    this._installOneSkill(skill, tools, opts);
    for (const t of tools) {
      console.log(chalk.green(`  ✓ ${skill.name} → ${TOOL_CONFIGS[t]?.label || t}`));
    }
  }

  // ── INSTALL BY TAG ──
  async installByTag(tag, opts = {}) {
    const registry = await this._loadRegistry();
    const tool = await this._resolveTool(opts);
    const tools = this._getTools(tool);
    const filtered = registry.skills.filter(s => s.tags && s.tags.includes(tag));
    if (!filtered.length) {
      console.log(chalk.yellow(`\nNo skills with tag "${tag}".`));
      return;
    }
    const spinner = ora(`Installing ${filtered.length} skills tagged "${tag}"...`).start();
    let installed = 0;
    for (const skill of filtered) {
      if (this._installOneSkill(skill, tools, opts)) installed++;
    }
    spinner.succeed(chalk.green(`Installed ${installed} skills tagged "${chalk.cyan(tag)}"`));
  }

  // ── INSTALL BY DIFFICULTY ──
  async installByDifficulty(level, opts = {}) {
    const registry = await this._loadRegistry();
    const tool = await this._resolveTool(opts);
    const tools = this._getTools(tool);
    const filtered = registry.skills.filter(s => s.difficulty === level);
    if (!filtered.length) {
      console.log(chalk.yellow(`\nNo skills at "${level}" level.`));
      return;
    }
    const spinner = ora(`Installing ${filtered.length} ${level} skills...`).start();
    let installed = 0;
    for (const skill of filtered) {
      if (this._installOneSkill(skill, tools, opts)) installed++;
    }
    spinner.succeed(chalk.green(`Installed ${installed} ${level} skills`));
  }

  // ── UNINSTALL ──
  async uninstall(opts = {}) {
    const tool = await this._resolveTool(opts);
    const tools = this._getTools(tool);
    let totalRemoved = 0;
    for (const t of tools) {
      const cfg = TOOL_CONFIGS[t];
      if (!cfg) continue;
      const skillDir = cfg.path;
      if (!fs.existsSync(skillDir)) {
        console.log(chalk.gray(`  ${cfg.icon} ${cfg.label}: no skills directory found`));
        continue;
      }
      let count = 0;
      const rmDir = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) rmDir(full);
          else if (entry.name.endsWith(cfg.fileExt) || entry.name.endsWith('.md')) {
            if (!opts.dryRun) fs.unlinkSync(full);
            count++;
          }
        }
      };
      rmDir(skillDir);
      totalRemoved += count;
      console.log(chalk.red(`  ✗ Removed ${count} skills from ${cfg.icon} ${cfg.label}`));
    }
    console.log('');
    console.log(boxen(
      chalk.red.bold(` Uninstalled ${totalRemoved.toLocaleString()} skills `) + '\n\n' +
      chalk.gray('Reinstall anytime: osf install --all'),
      { padding: 1, borderColor: 'red', borderStyle: 'round' }
    ));
    if (opts.dryRun) console.log(chalk.yellow('\n  (dry-run — no files were deleted)'));
  }

  // ── EXPORT ──
  async exportSkills(opts = {}) {
    const registry = await this._loadRegistry();
    const format = opts.format || 'json';
    const output = opts.output || path.join(process.cwd(), `osf-export.${format}`);

    if (format === 'json') {
      fs.writeFileSync(output, JSON.stringify(registry, null, 2));
    } else if (format === 'csv') {
      const header = 'name,category,difficulty,tags,description,file\n';
      const rows = registry.skills.map(s =>
        `"${s.name}","${s.category || ''}","${s.difficulty || ''}","${(s.tags || []).join(';')}","${(s.description || '').replace(/"/g, '""')}","${s.file}"`
      ).join('\n');
      fs.writeFileSync(output, header + rows);
    } else if (format === 'md') {
      let md = `# Omni Skills Forge — ${registry.skills.length.toLocaleString()} Skills\n\n`;
      md += `Generated: ${new Date().toISOString()}\n\n`;
      const byCat = {};
      for (const s of registry.skills) {
        const cat = (s.category || 'uncategorized').split('/')[0];
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(s);
      }
      for (const [cat, skills] of Object.entries(byCat).sort()) {
        md += `## ${cat} (${skills.length})\n\n`;
        for (const s of skills.slice(0, 20)) {
          md += `- **${s.name}** [${s.difficulty || 'N/A'}] — ${s.description || ''}\n`;
        }
        if (skills.length > 20) md += `\n_...and ${skills.length - 20} more_\n`;
        md += '\n';
      }
      fs.writeFileSync(output, md);
    }

    console.log(boxen(
      chalk.green.bold(` Exported ${registry.skills.length.toLocaleString()} skills `) + '\n\n' +
      chalk.gray(`Format: ${format.toUpperCase()}`) + '\n' +
      chalk.gray(`File: ${output}`) + '\n' +
      chalk.gray(`Size: ${(fs.statSync(output).size / 1024 / 1024).toFixed(2)} MB`),
      { padding: 1, borderColor: 'green', borderStyle: 'round' }
    ));
  }

  // ── LIST SKILLS ──
  async listSkills(opts = {}) {
    const registry = await this._loadRegistry();
    let skills = registry.skills;
    if (opts.category) skills = skills.filter(s => s.category && (s.category === opts.category || s.category.startsWith(opts.category + '/')));
    if (opts.difficulty) skills = skills.filter(s => s.difficulty === opts.difficulty);
    if (opts.tag) skills = skills.filter(s => s.tags && s.tags.includes(opts.tag));
    if (opts.json) { console.log(JSON.stringify(skills, null, 2)); return; }

    const table = new Table({ head: [chalk.cyan('Skill'), chalk.cyan('Category'), chalk.cyan('Level')], colWidths: [50, 25, 14], style: { compact: true } });
    const shown = skills.slice(0, 80);
    for (const s of shown) {
      const level = s.difficulty === 'expert' ? chalk.red(s.difficulty) : s.difficulty === 'advanced' ? chalk.yellow(s.difficulty) : s.difficulty === 'intermediate' ? chalk.blue(s.difficulty) : chalk.green(s.difficulty);
      table.push([s.name, s.category || '-', level]);
    }
    console.log(table.toString());
    console.log(chalk.gray(`\n  Showing ${Math.min(shown.length, 80)} of ${skills.length} skills. Use --json for full list.`));
    console.log(chalk.gray(`  Install: osf install --category <cat>  or  osf install --skill <name>\n`));
  }

  // ── SEARCH ──
  async searchSkills(query, opts = {}) {
    const registry = await this._loadRegistry();
    const q = query.toLowerCase();
    const results = registry.skills.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
    ).slice(0, parseInt(opts.limit) || 25);
    if (!results.length) { console.log(chalk.yellow(`No skills matching "${query}". Try a broader term.`)); return; }
    const table = new Table({ head: [chalk.cyan('Skill'), chalk.cyan('Category'), chalk.cyan('Description')], colWidths: [42, 22, 55], style: { compact: true } });
    for (const s of results) table.push([s.name, s.category || '-', (s.description || '').substring(0, 52)]);
    console.log(table.toString());
    console.log(chalk.gray(`  Found ${results.length} result(s). Install: osf install --skill <name>\n`));
  }

  // ── SKILL INFO ──
  async showSkillInfo(skillName) {
    const registry = await this._loadRegistry();
    const skill = registry.skills.find(s => s.name === skillName) || registry.skills.find(s => s.name && s.name.includes(skillName));
    if (!skill) { console.log(chalk.red(`Skill "${skillName}" not found.`)); return; }
    const info = [
      `${chalk.bold('Name:')}\t\t${skill.name}`,
      `${chalk.bold('Category:')}\t${skill.category || '-'}`,
      `${chalk.bold('Difficulty:')}\t${skill.difficulty || '-'}`,
      `${chalk.bold('Tags:')}\t\t${(skill.tags || []).join(', ') || '-'}`,
      `${chalk.bold('File:')}\t\t${skill.file}`,
      `${chalk.bold('Description:')}\t${skill.description || '-'}`,
      '',
      `${chalk.gray('Install:')} osf install --skill ${skill.name}`,
    ].join('\n');
    console.log(boxen(info, { padding: 1, borderColor: 'cyan', borderStyle: 'round', title: ' Skill Info ' }));
  }

  // ── CATEGORIES ──
  async listCategories() {
    const registry = await this._loadRegistry();
    const cats = {};
    for (const s of registry.skills) {
      const cat = (s.category || 'uncategorized').split('/')[0];
      cats[cat] = (cats[cat] || 0) + 1;
    }
    const table = new Table({ head: [chalk.cyan('Category'), chalk.cyan('Skills'), chalk.cyan('Install Command')], colWidths: [20, 12, 50], style: { compact: true } });
    for (const [cat, count] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
      table.push([cat, count, chalk.gray(`osf install --category ${cat}`)]);
    }
    console.log(table.toString());
    console.log(chalk.gray(`\n  ${Object.keys(cats).length} categories · ${registry.skills.length} total skills\n`));
  }

  // ── STATS ──
  async showStats() {
    const registry = await this._loadRegistry();
    const diffBreakdown = {};
    const catBreakdown = {};
    for (const s of registry.skills) {
      diffBreakdown[s.difficulty || 'unknown'] = (diffBreakdown[s.difficulty || 'unknown'] || 0) + 1;
      const cat = (s.category || 'uncategorized').split('/')[0];
      catBreakdown[cat] = (catBreakdown[cat] || 0) + 1;
    }
    const topCats = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => `  ${c}: ${n}`).join('\n');
    const diffLines = Object.entries(diffBreakdown).sort((a, b) => b[1] - a[1]).map(([d, n]) => `  ${d}: ${n}`).join('\n');
    const stats = [
      `${chalk.bold('Total Skills:')}\t${chalk.green(registry.skills.length.toLocaleString())}`,
      `${chalk.bold('Categories:')}\t${registry.categories.length}`,
      `${chalk.bold('Tools:')}\t\t${Object.keys(TOOL_CONFIGS).length} supported`,
      '',
      `${chalk.bold('By Difficulty:')}`,
      diffLines,
      '',
      `${chalk.bold('Top Categories:')}`,
      topCats,
    ].join('\n');
    console.log(boxen(stats, { padding: 1, borderColor: 'green', borderStyle: 'double', title: ' OSF Stats ' }));
  }
}
