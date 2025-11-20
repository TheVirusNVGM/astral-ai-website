const socials = [
  { label: 'Discord', href: 'https://discord.gg/zc2f6SMG26' },
  { label: 'Twitter', href: '#' },
  { label: 'GitHub', href: '#' }
]

export default function Footer() {
  return (
    <footer id="contact" className="bg-neo-black text-neo-white border-t-8 border-neo-orange pt-20 pb-10 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-xs uppercase tracking-[0.5em]">Stay Loud</p>
            <h3 className="font-heavy text-[15vw] md:text-[9vw] leading-none">ASTRAL.</h3>
            <p className="mt-4 text-lg text-white/80 max-w-xl">
              Minecraft modding for people who prefer hazard tape over rounded buttons.
              Come test the builder, send feedback, and help us keep the chaos intentional.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end justify-end gap-4">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="text-3xl font-display uppercase tracking-tight hover:text-neo-accent transition-colors"
              >
                {social.label} →
              </a>
            ))}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/15 text-xs uppercase tracking-[0.4em] flex flex-col md:flex-row gap-4 md:justify-between">
          <span>© 2025 Astral-AI. Logic for the illogical.</span>
          <span>Made with stubborn optimism + AI builder access</span>
        </div>
      </div>
    </footer>
  )
}
