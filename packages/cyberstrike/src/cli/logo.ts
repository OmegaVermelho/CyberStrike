export const logo = [
  "  ____  _____ ____      _____ _____    _    __  __    __     _______ ",
  " |  _ \\| ____|  _ \\    |_   _| ____|  / \\  |  \\/  |   \\ \\   / /___ / ",
  " | |_) |  _| | | | |_____| | |  _|   / _ \\ | |\\/| |____\\ \\ / /  |_ \\ ",
  " |  _ <| |___| |_| |_____| | | |___ / ___ \\| |  | |_____\\ V /  ___) |",
  " |_| \\_\\_____|____/      |_| |_____/_/   \\_\\_|  |_|      \\_/  |____/ ",
  "                                                                     ",
]

// Palettes — used by CLI (non-TUI) colorize function
export const palettes = {
  "red-team": ["#ff0000", "#cc0000", "#ff3333", "#990000"],
  fire: ["#ff0844", "#ffb199"],
  blood: ["#8b0000", "#ff0000", "#ff4444"],
  crimson: ["#dc143c", "#ff6b6b"],
  inferno: ["#ff4500", "#ff6347", "#ff0000"],
  rose: ["#e63946", "#ff6b6b"],
  rust: ["#b7410e", "#ff4500"],
  mono: ["#ff3333", "#ff3333"],
} as const

export type PaletteName = keyof typeof palettes

// Parse "#rrggbb" to [r, g, b]
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

// Interpolate between color stops at position t (0..1)
function interpolate(stops: [number, number, number][], t: number): [number, number, number] {
  if (stops.length === 1) return stops[0]
  const segment = t * (stops.length - 1)
  const i = Math.min(Math.floor(segment), stops.length - 2)
  const f = segment - i
  const a = stops[i]
  const b = stops[i + 1]
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ]
}

/**
 * Apply vertical gradient to the logo lines using the given palette.
 * Each line gets a color interpolated from the palette stops.
 * Returns array of ANSI-colored strings.
 */
export function colorize(paletteName?: PaletteName): string[] {
  const name = paletteName ?? randomPalette()
  const colors = palettes[name]
  const stops = colors.map(hexToRgb)

  return logo.map((line, i) => {
    const t = logo.length > 1 ? i / (logo.length - 1) : 0
    const [r, g, b] = interpolate(stops, t)
    return `\x1b[38;2;${r};${g};${b}m${line}\x1b[0m`
  })
}

export function randomPalette(): PaletteName {
  return "red-team"
}
