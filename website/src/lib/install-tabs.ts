export const HERO_INSTALL_TABS = [
  {
    id: 'npx',
    label: 'npx',
    lines: ['npx @exor404/mdslides'],
    copy: 'npx @exor404/mdslides',
  },
  {
    id: 'npm',
    label: 'npm',
    lines: ['npm i -D @exor404/mdslides', 'npx mdslides ./deck'],
    copy: 'npm i -D @exor404/mdslides\nnpx mdslides ./deck',
  },
  {
    id: 'pnpm',
    label: 'pnpm',
    lines: ['pnpm add -D @exor404/mdslides', 'pnpm exec mdslides ./deck'],
    copy: 'pnpm add -D @exor404/mdslides\npnpm exec mdslides ./deck',
  },
  {
    id: 'yarn',
    label: 'yarn',
    lines: ['yarn add -D @exor404/mdslides', 'yarn mdslides ./deck'],
    copy: 'yarn add -D @exor404/mdslides\nyarn mdslides ./deck',
  },
  {
    id: 'global',
    label: 'global',
    lines: ['npm i -g @exor404/mdslides', 'mdslides ./deck'],
    copy: 'npm i -g @exor404/mdslides\nmdslides ./deck',
  },
];
