import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import { OmniInstaller } from './installer.js';

export class OmniUI {
  constructor(installer) {
    this.installer = installer || new OmniInstaller();
  }

  async runInteractive() {
    console.log(boxen(
      chalk.cyan.bold('⚡ Omni Skills Forge — Interactive Setup') + '\n' +
      chalk.gray('50,000+ expert AI agent skills'),
      { padding: 1, borderColor: 'cyan', borderStyle: 'round' }
    ));

    const { mode } = await inquirer.prompt([{
      type: 'list', name: 'mode', message: 'What would you like to do?',
      choices: [
        { name: '🚀 Install All (50,000+ skills — single click)', value: 'all' },
        { name: '📂 Browse by Category', value: 'category' },
        { name: '🏷️  Filter by Tag', value: 'tag' },
        { name: '📊 Filter by Difficulty', value: 'difficulty' },
        { name: '🔍 Search & Install', value: 'search' },
        { name: '📈 View Stats', value: 'stats' },
        new inquirer.Separator(),
        { name: '🖥️  Open Visual Dashboard', value: 'dashboard' },
        { name: '🩺 Run Doctor (diagnose tools)', value: 'doctor' },
      ]
    }]);

    if (mode === 'stats') { await this.installer.showStats(); return; }
    if (mode === 'dashboard') {
      const { OmniDashboard } = await import('./dashboard.js');
      const registry = await this.installer._loadRegistry();
      const dashboard = new OmniDashboard(registry);
      const outputPath = await dashboard.generate({});
      const open = (await import('open')).default;
      try { await open(outputPath); } catch {}
      return;
    }
    if (mode === 'doctor') {
      const { OmniDoctor } = await import('./doctor.js');
      const doctor = new OmniDoctor();
      await doctor.run();
      return;
    }

    const { tool } = await inquirer.prompt([{
      type: 'list', name: 'tool', message: 'Select target tool:',
      choices: [
        { name: '🟠 Claude Code', value: 'claude-code' },
        { name: '🔵 Kilo', value: 'kilo' },
        { name: '🟣 Cline', value: 'cline' },
        { name: '🟢 Opencode', value: 'opencode' },
        { name: '🟡 Cursor', value: 'cursor' },
        { name: '🔷 Windsurf', value: 'windsurf' },
        { name: '💻 All Tools', value: 'all-tools' },
      ]
    }]);

    const opts = { tool };

    switch (mode) {
      case 'all': {
        const { confirm } = await inquirer.prompt([{ type: 'confirm', name: 'confirm', message: 'Install all 50,000+ skills?', default: true }]);
        if (confirm) await this.installer.installAll(opts);
        break;
      }
      case 'category': {
        const registry = await this.installer._loadRegistry();
        const cats = {};
        for (const s of registry.skills) {
          const cat = (s.category || '').split('/')[0];
          if (cat) cats[cat] = (cats[cat] || 0) + 1;
        }
        const choices = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => ({
          name: `${cat} (${count} skills)`, value: cat
        }));
        const { category } = await inquirer.prompt([{ type: 'list', name: 'category', message: 'Choose a category:', choices }]);
        await this.installer.installCategory(category, opts);
        break;
      }
      case 'tag': {
        const registry = await this.installer._loadRegistry();
        const tagCounts = {};
        for (const s of registry.skills) {
          for (const t of (s.tags || [])) {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
          }
        }
        const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([tag, count]) => ({
          name: `${tag} (${count} skills)`, value: tag
        }));
        if (!tags.length) { console.log(chalk.yellow('No tags found.')); return; }
        const { tag } = await inquirer.prompt([{ type: 'list', name: 'tag', message: 'Choose a tag:', choices: tags }]);
        const { action } = await inquirer.prompt([{
          type: 'list', name: 'action', message: 'What would you like to do?',
          choices: [
            { name: `Install all skills tagged "${tag}"`, value: 'install' },
            { name: `List skills tagged "${tag}" first`, value: 'list' },
          ]
        }]);
        if (action === 'install') {
          await this.installer.installByTag(tag, opts);
        } else {
          await this.installer.listSkills({ tag, ...opts });
        }
        break;
      }
      case 'difficulty': {
        const { difficulty } = await inquirer.prompt([{
          type: 'list', name: 'difficulty', message: 'Select difficulty level:',
          choices: [
            { name: '🟢 Beginner', value: 'beginner' },
            { name: '🔵 Intermediate', value: 'intermediate' },
            { name: '🟡 Advanced', value: 'advanced' },
            { name: '🔴 Expert', value: 'expert' },
          ]
        }]);
        const { action } = await inquirer.prompt([{
          type: 'list', name: 'action', message: 'What would you like to do?',
          choices: [
            { name: `Install all ${difficulty} skills`, value: 'install' },
            { name: `List ${difficulty} skills first`, value: 'list' },
          ]
        }]);
        if (action === 'install') {
          await this.installer.installByDifficulty(difficulty, opts);
        } else {
          await this.installer.listSkills({ difficulty, ...opts });
        }
        break;
      }
      case 'search': {
        const { query } = await inquirer.prompt([{ type: 'input', name: 'query', message: 'Search for a skill:' }]);
        await this.installer.searchSkills(query, opts);
        const { pickSkill } = await inquirer.prompt([{
          type: 'confirm', name: 'pickSkill', message: 'Install a specific skill from results?', default: false
        }]);
        if (pickSkill) {
          const { skillName } = await inquirer.prompt([{ type: 'input', name: 'skillName', message: 'Enter skill name to install:' }]);
          await this.installer.installSkill(skillName, opts);
        }
        break;
      }
    }
  }
}
