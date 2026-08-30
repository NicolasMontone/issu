const commands = [
  { cmd: "issu init", note: "create a store (global by default)" },
  { cmd: 'issu create "Fix login redirect" -p urgent -l bug', note: "add an issue" },
  { cmd: "issu ls --tree", note: "see the hierarchy" },
  { cmd: "issu done WEB-1", note: "close it out" },
]

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background px-6 py-16 text-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
          local-first · plain markdown · git-syncable
        </span>
        <h1 className="text-5xl font-semibold tracking-tight">issu</h1>
        <p className="max-w-md text-pretty text-muted-foreground">
          A local, opinionated task tracker — a Linear you own. Your issues live as
          plain markdown files on disk, driven by a fast CLI.
        </p>
      </div>

      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-card font-mono text-sm">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
          <span className="ml-2 text-xs text-muted-foreground">terminal</span>
        </div>
        <div className="flex flex-col gap-3 p-4">
          {commands.map(({ cmd, note }) => (
            <div key={cmd} className="flex flex-col gap-0.5">
              <code className="text-foreground">
                <span className="text-muted-foreground">$ </span>
                {cmd}
              </code>
              <span className="pl-4 text-xs text-muted-foreground">{note}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        landing page placeholder — install script coming soon
      </p>
    </main>
  )
}
