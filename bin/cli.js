#!/usr/bin/env node
import { Command } from 'commander';
import { OmniInstaller } from '../src/installer.js';
import { OmniUI } from '../src/ui.js';
import { OmniDashboard } from '../src/dashboard.js';
import { OmniDoctor } from '../src/doctor.js';
import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const VERSION = '2.1.1';

function showBanner() {
  const banner = gradient.rainbow.multiline(`
  ╔═══════════════════════════════════════════════════╗
  ║           ⚡ OMNI SKILLS FORGE ⚡                ║
  ║      50,000+ Expert AI Agent Skills              ║
  ║   Claude Code · Kilo · Cline · Opencode         ║
  ║        Cursor · Windsurf · & More                ║
  ╚═══════════════════════════════════════════════════╝`);
  console.log('\n' + banner + '\n');
}

const program = new Command();

program
  .name('omni-skills-forge')
  .description('50,000+ expert AI agent skills — install to any AI coding tool')
  .version(VERSION)
  .addHelpText('before', () => { showBanner(); return ''; })
  .addHelpText('after', () => {
    console.log('');
    console.log(boxen(
      chalk.bold(' Quick Start:') + '\n\n' +
      chalk.cyan('  osf install --all') + chalk.gray('              # Install all 50,000+ skills') + '\n' +
      chalk.cyan('  osf install --category ai-ml') + chalk.gray('    # Install by category') + '\n' +
      chalk.cyan('  osf install --tag react') + chalk.gray('         # Install by tag') + '\n' +
      chalk.cyan('  osf install --difficulty expert') + chalk.gray('   # Install by difficulty') + '\n' +
      chalk.cyan('  osf search "kubernetes"') + chalk.gray('        # Search skills') + '\n' +
      chalk.cyan('  osf dashboard') + chalk.gray('                  # Open visual dashboard') + '\n' +
      chalk.cyan('  osf doctor') + chalk.gray('                      # Diagnose environment'),
      { padding: 1, borderColor: 'cyan', borderStyle: 'round', title: ' Examples ' }
    ));
    return '';
  });

// ── INSTALL ──
program
  .command('install')
  .alias('i')
  .description('Install skills to your AI tools')
  .option('-a, --all', 'Install all 50,000+ skills (single-click)')
  .option('-c, --category <name>', 'Install skills from a specific category')
  .option('-s, --skill <name>', 'Install a single specific skill by name')
  .option('--tag <tag>', 'Install all skills matching a tag')
  .option('--difficulty <level>', 'Install all skills at a difficulty level (beginner/intermediate/advanced/expert)')
  .option('-t, --tool <name>', 'Target a specific AI tool (claude-code, kilo, cline, opencode, cursor, windsurf, all-tools)')
  .option('-d, --dir <path>', 'Custom install directory')
  .option('-f, --force', 'Overwrite existing skills')
  .option('--dry-run', 'Preview what would be installed without writing files')
  .action(async (opts) => {
    showBanner();
    const installer = new OmniInstaller();
    if (opts.all) {
      await installer.installAll(opts);
    } else if (opts.category) {
      await installer.installCategory(opts.category, opts);
    } else if (opts.skill) {
      await installer.installSkill(opts.skill, opts);
    } else if (opts.tag) {
      await installer.installByTag(opts.tag, opts);
    } else if (opts.difficulty) {
      await installer.installByDifficulty(opts.difficulty, opts);
    } else {
      const ui = new OmniUI(installer);
      await ui.runInteractive();
    }
  });

// ── UNINSTALL ──
program
  .command('uninstall')
  .aliases(['remove', 'rm'])
  .description('Remove installed skills from AI tools')
  .option('-t, --tool <name>', 'Target a specific AI tool')
  .option('--dry-run', 'Preview what would be removed')
  .action(async (opts) => {
    showBanner();
    const installer = new OmniInstaller();
    await installer.uninstall(opts);
  });

// ── LIST ──
program
  .command('list')
  .aliases(['ls'])
  .description('List available skills')
  .option('-c, --category <name>', 'Filter by category')
  .option('--tag <tag>', 'Filter by tag')
  .option('--difficulty <level>', 'Filter by difficulty')
  .option('--json', 'Output raw JSON')
  .action(async (opts) => {
    const installer = new OmniInstaller();
    await installer.listSkills(opts);
  });

// ── SEARCH ──
program
  .command('search')
  .aliases(['s'])
  .description('Search across all 50,000+ skills')
  .argument('<query>', 'Search query')
  .option('-l, --limit <n>', 'Max results', '25')
  .action(async (query, opts) => {
    const installer = new OmniInstaller();
    await installer.searchSkills(query, opts);
  });

// ── INFO ──
program
  .command('info')
  .description('Show detailed info about a specific skill')
  .argument('<name>', 'Skill name')
  .action(async (name) => {
    const installer = new OmniInstaller();
    await installer.showSkillInfo(name);
  });

// ── CATEGORIES ──
program
  .command('categories')
  .aliases(['cats'])
  .description('Browse all skill categories')
  .action(async () => {
    const installer = new OmniInstaller();
    await installer.listCategories();
  });

// ── STATS ──
program
  .command('stats')
  .description('Show library statistics')
  .action(async () => {
    showBanner();
    const installer = new OmniInstaller();
    await installer.showStats();
  });

// ── DASHBOARD ──
program
  .command('dashboard')
  .aliases(['ui', 'web'])
  .description('Generate and open an interactive visual dashboard')
  .option('-o, --output <path>', 'Output HTML file path')
  .option('--no-open', 'Generate without opening in browser')
  .action(async (opts) => {
    showBanner();
    const installer = new OmniInstaller();
    const registry = await installer._loadRegistry();
    const dashboard = new OmniDashboard(registry);
    const outputPath = await dashboard.generate(opts);
    if (opts.open !== false) {
      console.log(chalk.cyan('  Opening dashboard in browser...'));
      try {
        await open(outputPath);
      } catch {
        console.log(chalk.yellow(`  Could not auto-open. Open manually: ${outputPath}`));
      }
    }
  });

// ── DOCTOR ──
program
  .command('doctor')
  .aliases(['check', 'diagnose'])
  .description('Diagnose your environment and tool installations')
  .action(async () => {
    const doctor = new OmniDoctor();
    await doctor.run();
  });

// ── EXPORT ──
program
  .command('export')
  .aliases(['exp'])
  .description('Export skills registry to JSON, CSV, or Markdown')
  .option('-f, --format <type>', 'Export format: json, csv, md', 'json')
  .option('-o, --output <path>', 'Output file path')
  .action(async (opts) => {
    showBanner();
    const installer = new OmniInstaller();
    await installer.exportSkills(opts);
  });

// ── UPDATE ──
program
  .command('update')
  .aliases(['u'])
  .description('Update to the latest skill library')
  .action(async () => {
    showBanner();
    console.log(chalk.cyan('Checking for updates...'));
    console.log(chalk.green(`You are on version ${VERSION}`));
    console.log(chalk.gray('Run: npm update -g omni-skills-forge'));
  });

// ── GENERATE ──
program
  .command('generate')
  .description('Regenerate the skill library locally')
  .option('-n, --count <number>', 'Target skill count', '50000')
  .action(async (opts) => {
    showBanner();
    console.log(chalk.cyan('Generating skill library...'));
    const { execSync } = await import('child_process');
    try {
      execSync(`node scripts/generate-skills.js ${opts.count}`, { stdio: 'inherit' });
      console.log(chalk.green('\n✓ Skills generated successfully!'));
    } catch (e) {
      console.error(chalk.red('Generation failed:'), e.message);
    }
  });

program.parse();
