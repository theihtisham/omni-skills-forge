/**
 * omni-skills-forge — Public API
 * Use programmatically or via CLI
 */

export { OmniInstaller } from './installer.js';
export { OmniUI } from './ui.js';
export { OmniDashboard } from './dashboard.js';
export { OmniDoctor } from './doctor.js';

export const VERSION = '2.1.1';
export const SUPPORTED_TOOLS = ['claude-code', 'kilo', 'cline', 'opencode', 'cursor', 'windsurf'];
