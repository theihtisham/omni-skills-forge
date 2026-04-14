#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PROJECT_ROOT, 'skills');
const REGISTRY_DIR = path.join(PROJECT_ROOT, 'registry');
const REGISTRY_PATH = path.join(REGISTRY_DIR, 'master-registry.json');

function walkDir(dir, basePath = '') {
  const skills = [];
  if (!fs.existsSync(dir)) return skills;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      skills.push(...walkDir(fullPath, relPath));
    } else if (entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const fm = parseFrontmatter(content);
      if (fm) {
        skills.push({
          name: fm.name || entry.name.replace('.md', ''),
          category: fm.category || basePath.replace(/\\/g, '/'),
          version: fm.version || '1.0.0',
          difficulty: fm.difficulty || 'intermediate',
          tags: fm.tags || [],
          description: fm.description || '',
          file: relPath,
        });
      }
    }
  }
  return skills;
}

function parseFrontmatter(content) {
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

function buildRegistry() {
  console.log('Scanning skills directory...');
  const skills = walkDir(SKILLS_DIR);
  const categories = [...new Set(skills.map(s => s.category).filter(Boolean))];

  const registry = {
    version: '1.0.0',
    totalSkills: skills.length,
    builtAt: new Date().toISOString(),
    categories,
    skills,
  };

  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

  console.log(`Registry built: ${skills.length} skills, ${categories.length} categories`);
  console.log(`Saved to: ${REGISTRY_PATH}`);
}

buildRegistry();
