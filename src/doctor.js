import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import fs from 'fs';
import path from 'path';
import ora from 'ora';

const HOME = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;

const TOOL_CHECKS = {
  'claude-code': {
    name: 'Claude Code',
    icon: '🟠',
    paths: [path.join(HOME, '.claude'), path.join(HOME, '.claude', 'skills')],
    skillPath: path.join(HOME, '.claude', 'skills'),
    fileExt: '.md',
    installCmd: 'osf install --all --tool claude-code',
  },
  'kilo': {
    name: 'Kilo',
    icon: '🔵',
    paths: [path.join(HOME, '.kilo'), path.join(HOME, '.kilo', 'skills')],
    skillPath: path.join(HOME, '.kilo', 'skills'),
    fileExt: '.md',
    installCmd: 'osf install --all --tool kilo',
  },
  'cline': {
    name: 'Cline',
    icon: '🟣',
    paths: [path.join(HOME, '.cline'), path.join(HOME, '.cline', 'skills')],
    skillPath: path.join(HOME, '.cline', 'skills'),
    fileExt: '.md',
    installCmd: 'osf install --all --tool cline',
  },
  'opencode': {
    name: 'Opencode',
    icon: '🟢',
    paths: [path.join(HOME, '.opencode'), path.join(HOME, '.opencode', 'skills')],
    skillPath: path.join(HOME, '.opencode', 'skills'),
    fileExt: '.md',
    installCmd: 'osf install --all --tool opencode',
  },
  'cursor': {
    name: 'Cursor',
    icon: '🟡',
    paths: [path.resolve(process.cwd(), '.cursor'), path.resolve(process.cwd(), '.cursor', 'rules')],
    skillPath: path.resolve(process.cwd(), '.cursor', 'rules'),
    fileExt: '.mdc',
    installCmd: 'osf install --all --tool cursor',
  },
  'windsurf': {
    name: 'Windsurf',
    icon: '🔷',
    paths: [path.resolve(process.cwd(), '.windsurf'), path.resolve(process.cwd(), '.windsurf', 'rules')],
    skillPath: path.resolve(process.cwd(), '.windsurf', 'rules'),
    fileExt: '.md',
    installCmd: 'osf install --all --tool windsurf',
  },
};

export class OmniDoctor {
  async run() {
    console.log(boxen(
      chalk.bold.cyan(' OSF Doctor — Environment Diagnostic '),
      { padding: 1, borderColor: 'cyan', borderStyle: 'round' }
    ));
    console.log('');

    // Node.js check
    const nodeVersion = process.version;
    const nodeOk = parseInt(nodeVersion.slice(1).split('.')[0]) >= 18;
    console.log(nodeOk
      ? chalk.green(`  ✓ Node.js ${nodeVersion} (>= 18.0.0)`)
      : chalk.red(`  ✗ Node.js ${nodeVersion} (requires >= 18.0.0)`)
    );

    // npm check
    let npmVersion = 'not found';
    try {
      const { execSync } = await import('child_process');
      npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
      console.log(chalk.green(`  ✓ npm v${npmVersion}`));
    } catch {
      console.log(chalk.yellow('  ⚠ npm not found'));
    }

    console.log('');
    console.log(chalk.bold('  Tool Detection:'));
    console.log('');

    const table = new Table({
      head: [chalk.cyan('Tool'), chalk.cyan('Config Dir'), chalk.cyan('Skills Installed'), chalk.cyan('Status')],
      colWidths: [16, 40, 18, 16],
      style: { compact: true },
    });

    const results = [];
    for (const [key, check] of Object.entries(TOOL_CHECKS)) {
      const dirExists = fs.existsSync(check.paths[0]);
      const skillDirExists = fs.existsSync(check.skillPath);
      let skillCount = 0;
      if (skillDirExists) {
        try {
          const files = fs.readdirSync(check.skillPath);
          skillCount = files.filter(f => f.endsWith(check.fileExt)).length;
        } catch { /* empty */ }
      }
      const status = skillCount > 0 ? chalk.green('Ready') : dirExists ? chalk.yellow('No skills') : chalk.gray('Not found');
      table.push([
        `${check.icon} ${check.name}`,
        dirExists ? chalk.green(check.paths[0]) : chalk.gray(check.paths[0]),
        skillCount > 0 ? chalk.green(skillCount.toLocaleString()) : chalk.gray('0'),
        status,
      ]);
      results.push({ key, dirExists, skillCount, skillDirExists });
    }
    console.log(table.toString());

    // Recommendations
    const noSkills = results.filter(r => r.dirExists && r.skillCount === 0);
    const notFound = results.filter(r => !r.dirExists);

    if (noSkills.length || notFound.length) {
      console.log('');
      console.log(chalk.bold('  Recommendations:'));
      if (noSkills.length) {
        console.log(chalk.yellow(`\n  Tools detected but no skills installed:`));
        for (const r of noSkills) {
          const check = TOOL_CHECKS[r.key];
          console.log(chalk.gray(`    → ${check.icon} ${check.name}: ${check.installCmd}`));
        }
      }
      if (notFound.length) {
        console.log(chalk.gray(`\n  Tools not detected (install the tool first):`));
        for (const r of notFound) {
          const check = TOOL_CHECKS[r.key];
          console.log(chalk.gray(`    → ${check.icon} ${check.name}`));
        }
      }
    }

    console.log('');
    const totalInstalled = results.reduce((sum, r) => sum + r.skillCount, 0);
    console.log(boxen(
      chalk.bold(` Summary `) + '\n\n' +
      chalk.white(`Tools detected: `) + chalk.green(results.filter(r => r.dirExists).length) + chalk.gray(` / ${results.length}`) + '\n' +
      chalk.white(`Skills installed: `) + chalk.green(totalInstalled.toLocaleString()) + '\n' +
      chalk.white(`Quick fix: `) + chalk.cyan(`osf install --all`),
      { padding: 1, borderColor: totalInstalled > 0 ? 'green' : 'yellow', borderStyle: 'round' }
    ));
    console.log('');
  }
}
