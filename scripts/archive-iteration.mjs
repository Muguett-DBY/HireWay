// Builds a frozen copy of the site at a given commit under
// public/<iteration>/ so it is served at /<iteration>/ forever.
// Usage: node scripts/archive-iteration.mjs <commit-ish> <iteration-name>
import { execSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const [ref, name] = process.argv.slice(2)
if (!ref || !/^[a-z0-9-]+$/.test(name ?? '')) {
  console.error('Usage: node scripts/archive-iteration.mjs <commit> <name>')
  process.exit(1)
}

const worktree = resolve(`../hireway-archive-${name}`)
const target = resolve(`public/${name}`)

// A clean slate both sides: drop any earlier worktree and output folder.
if (existsSync(worktree)) execSync(`git worktree remove --force "${worktree}"`)
rmSync(target, { recursive: true, force: true })

execSync(`git worktree add "${worktree}" ${ref}`, { stdio: 'inherit' })
try {
  // Dependencies of that era, then a build rooted at the sub path.
  execSync('npm ci --ignore-scripts', { cwd: worktree, stdio: 'inherit' })
  execSync(`npx vite build --base=/${name}/`, {
    cwd: worktree,
    stdio: 'inherit',
    // Windows shells rewrite leading slashes in arguments; keep ours intact.
    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
  })
  cpSync(`${worktree}/dist`, target, { recursive: true })
  console.log(`Archived ${ref} at public/${name}/`)
} finally {
  execSync(`git worktree remove --force "${worktree}"`)
}
