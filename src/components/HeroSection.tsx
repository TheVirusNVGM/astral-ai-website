'use client'

import DownloadButton from './DownloadButton'
import dynamic from 'next/dynamic'

const MiniBoardDemo = dynamic(() => import('./demo/MiniBoardDemo'), { ssr: false })

const stats = [
  { label: 'AI BUILDER FLOWS', value: '82', detail: 'ready-made rituals' },
  { label: 'MOD PACKS TUNED', value: '1.7K', detail: 'chaos controlled' },
  { label: 'SECONDS TO ORGANIZE', value: '3 min', detail: 'average session' },
  { label: 'VOLUNTEER TESTERS', value: '120', detail: 'and counting' }
]

const marqueeItems = [
  'NO TEMPLATES',
  'AI BUILDER ACCESS',
  'MINECRAFT CHAOS',
  'HAZARD RIBBONS',
  'ASTRAL LAB'
]

export default function HeroSection() {
  return (
    <section id="hero" className="relative py-20 lg:py-28 border-b-4 border-neo-black/70 overflow-hidden text-[#f7ecff]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 right-6 w-64 h-64 border-4 border-neo-black/60 rounded-full bg-neo-blue/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 border-4 border-neo-black/40 bg-neo-orange/20 rotate-6 blur-2xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-stretch">
          <div>
            <div className="inline-flex items-center gap-3 neo-pill bg-white/90 text-xs tracking-[0.4em] text-neo-black">
              <span className="w-2 h-2 bg-neo-black rounded-full" />
              Astral Build Lab
            </div>
            <h1 className="mt-6 font-display text-[clamp(3rem,7vw,5.5rem)] leading-[0.9] uppercase tracking-tight">
              We weaponize AI builder for Minecraft misfits
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[#e7d9ff] max-w-2xl">
              Dark purple looming cosmos, twinkling stars, and a launcher that doesn't know the word "carefully".
              We automate the dirty work so you can focus on pure chaos.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <DownloadButton />
              <button className="btn btn-outline btn-lg">
                Watch the chaos
              </button>
            </div>

          </div>

          <div className="relative border-4 border-neo-black bg-[#1a0034] shadow-neo-lg rounded-[32px] p-6 clip-corner overflow-hidden flex flex-col">
            <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(255, 58, 203, 0.3), transparent 55%)' }} />
            <div className="relative flex items-center justify-between text-xs uppercase tracking-[0.4em]">
              <span>AI Builder Cockpit</span>
              <span className="neo-tag text-[0.55rem]">Prototype</span>
            </div>
            <div className="relative mt-4 flex-1 overflow-hidden min-h-[450px] max-h-[450px] rounded-[26px] border border-white/8">
              <MiniBoardDemo />
            </div>
            <div className="relative mt-6 flex flex-wrap gap-3">
              <span className="neo-pill bg-white text-neo-black text-[0.6rem] tracking-[0.4em]">
                Logic for the illogical
              </span>
              <span className="neo-pill bg-neo-orange/80 text-white text-[0.6rem] tracking-[0.4em]">
                AI builder access
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div 
              key={stat.label}
              className="border-4 border-neo-black/80 bg-[#16002d]/80 p-4 shadow-neo-sm clip-corner backdrop-blur"
            >
              <p className="font-heavy text-3xl text-neo-white">{stat.value}</p>
              <p className="text-[0.7rem] uppercase tracking-[0.35em] text-white/70">{stat.label}</p>
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/40 mt-2">
                {stat.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="relative mt-16">
          <div className="neo-marquee neo-marquee-tilt w-screen -translate-x-1/2 left-1/2 relative">
            <div className="neo-marquee-content">
              {marqueeItems.map((item) => (
                <span key={item}>
                  {'// '}
                  {item}
                  {' //'}
                </span>
              ))}
              {marqueeItems.map((item) => (
                <span key={`${item}-duplicate`}>
                  {'// '}
                  {item}
                  {' //'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
