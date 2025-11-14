'use client'

const toolkit = [
  {
    title: "AI Builder Access",
    description: "Compose wild mod stacks with conversational prompts and visual nodes. The builder keeps everything balanced while you stay feral.",
    label: "Builder"
  },
  {
    title: "Visual Mod Atlas",
    description: "See every install, dependency, and toggle living on one giant atlas. Rearrange with drag gestures or let AI shuffle it for you.",
    label: "Atlas"
  },
  {
    title: "Instant Snapshots",
    description: "Freeze experimental loadouts and send them to friends with one code. No manual exporting — just pure kitbashing energy.",
    label: "Snapshots"
  },
  {
    title: "Hazard Tape Alerts",
    description: "The launcher throws ribbons and warning labels across any weird behavior before it escalates. It’s dramatic on purpose.",
    label: "Alerts"
  }
]

export default function FeaturesSection() {
  return (
    <section id="toolkit" className="relative py-24 border-b-4 border-neo-black/70 bg-transparent">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] font-semibold">
              Toolkit
            </p>
            <h2 className="mt-4 font-display text-[clamp(2.5rem,5vw,4rem)] uppercase leading-none">
              Our launcher is a <span className="text-gradient">playground</span> not a spreadsheet
            </h2>
          </div>
          <p className="max-w-xl text-base md:text-lg text-white/80">
            These are the modules we obsess over daily. Nothing polite, nothing timid — just useful chaos that actually makes modding fun again.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {toolkit.map((item) => (
            <div
              key={item.title}
              className="relative border-4 border-neo-black bg-[#16002d]/90 text-[#f7ecff] shadow-neo-sm p-6 flex flex-col min-h-[260px]"
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/70">
                <span>{item.label}</span>
                <span className="w-2 h-2 bg-neo-black rounded-full animate-pulse" />
              </div>
              <h3 className="mt-4 font-display text-2xl uppercase leading-tight">
                {item.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/75">
                {item.description}
              </p>
              <div className="mt-auto pt-4">
                <div className="neo-divider" />
                <p className="mt-3 text-[0.65rem] uppercase tracking-[0.4em] text-neo-black/60">
                  READY FOR TEST PILOTS
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
