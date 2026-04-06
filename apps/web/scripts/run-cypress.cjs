const { spawn } = require('child_process')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const args = process.argv.slice(2)

const child = spawn('npx', ['cypress', 'run', ...args], {
  cwd: process.cwd(),
  env,
  shell: true,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
