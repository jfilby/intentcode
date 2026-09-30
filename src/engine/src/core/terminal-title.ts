/**
 * The tab title a build owns while it works.
 *
 * A terminal re-renders its tab on every title change, so writing OSC 0
 * escapes on a timer animates the tab without touching what the command
 * prints. The title is the intentcode brand, then a spinner glyph, then the
 * project: the two leading cells are what stay visible when a tab is too
 * narrow for the rest.
 *
 * A title is read from a project name, so every character is sanitized
 * before it becomes an escape: a name holding a control character would
 * otherwise be able to drive the terminal.
 */

/** What intentcode calls itself in a tab, whatever it is doing. */
export const BRAND = 'I'

/** The spinner, the way an interactive agent animates its own title. */
export const SPINNER_FRAMES = [
  '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'
] as const

/** Fast enough to read as motion, slow enough not to strobe. */
export const SPINNER_FRAME_MS = 80

/** How much of the label a tab can show before it stops being a title. */
const MAX_LABEL = 48

const OSC = '\x1b]0;'
const BEL = '\x07'

/** Whether a build ended in a build or in a diagnostic. */
export type BuildOutcome = 'ok' | 'fail'

export interface TitleAnimation {
  /**
   * Settle the title on the outcome and release everything the animation
   * holds. Idempotent, so an exit handler and the command can both call it.
   */
  stop(outcome: BuildOutcome): void
}

/** The animation for a command that must not touch the terminal. */
const NO_TITLE_ANIMATION: TitleAnimation = { stop: () => {} }

/** A stream a title can be written to, and a terminal if it is one. */
export interface TitleStream {
  write(text: string): unknown
  isTTY?: boolean
}

/**
 * A title part with nothing a terminal can be made to run in it: control
 * characters become spaces, and what is left is one line of at most
 * {@link MAX_LABEL} characters.
 */
export function sanitizeTitlePart(value: string): string {

  const printable = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (printable.length <= MAX_LABEL) return printable

  // Truncating by code unit can cut a surrogate pair in half, and an unpaired
  // half reaches the terminal as a replacement box rather than the character.
  const cut = [...printable].slice(0, MAX_LABEL - 1).join('')
  return `${cut}…`
}

/** The tab title while a build works: brand, spinner, project. */
export function workingTitle(label: string, frame: number): string {

  const glyph = SPINNER_FRAMES[
    ((frame % SPINNER_FRAMES.length) + SPINNER_FRAMES.length) % SPINNER_FRAMES.length
  ]

  return label === '' ? `${BRAND} ${glyph}` : `${BRAND} ${glyph} ${label}`
}

/**
 * The tab title once a build has stopped, which no longer animates. The
 * spinner is replaced by what it was spinning for, and the brand stays.
 */
export function settledTitle(label: string, outcome: BuildOutcome): string {

  const mark = outcome === 'ok' ? '✓' : '✗'
  return label === '' ? `${BRAND} ${mark}` : `${BRAND} ${mark} ${label}`
}

/** The terminal title is one OSC 0 escape terminated by BEL. */
export function oscTitle(title: string): string {
  return `${OSC}${title}${BEL}`
}

/**
 * Animate the tab title until it is stopped.
 *
 * A stream that is not a terminal gets nothing: a command whose output is a
 * pipe or a file never writes a title, so a log holds nothing but the build.
 *
 * The animation settles on every way out of the process, including a signal:
 * a title left mid-spinner after a Ctrl-C would outlive the build and say the
 * build is still running. A handled signal is re-raised without the handler
 * so the process still dies of it.
 */
export function startBuildTitle(
  label: string,
  stream: TitleStream
): TitleAnimation {

  if (stream.isTTY !== true) return NO_TITLE_ANIMATION

  const name = sanitizeTitlePart(label)
  let frame = 0
  let stopped = false
  let last: string | undefined

  const emit = (title: string): void => {
    // The tab is repainted even for an unchanged title, and a build is
    // quieter for it.
    if (title === last) return
    last = title
    stream.write(oscTitle(title))
  }

  const detach = (): void => {
    process.off('exit', onExit)
    process.off('SIGINT', onInterrupt)
    process.off('SIGTERM', onTerminate)
  }

  const settle = (outcome: BuildOutcome): void => {
    if (stopped) return
    stopped = true
    clearInterval(timer)
    emit(settledTitle(name, outcome))
    detach()
  }

  function onExit(): void {
    settle('fail')
  }

  function onInterrupt(): void {
    settle('fail')
    process.off('SIGINT', onInterrupt)
    process.kill(process.pid, 'SIGINT')
  }

  function onTerminate(): void {
    settle('fail')
    process.off('SIGTERM', onTerminate)
    process.kill(process.pid, 'SIGTERM')
  }

  emit(workingTitle(name, frame))

  const timer = setInterval(() => {
    frame += 1
    emit(workingTitle(name, frame))
  }, SPINNER_FRAME_MS)

  // Never keep the event loop alive for a cosmetic animation.
  timer.unref?.()

  process.once('exit', onExit)
  process.once('SIGINT', onInterrupt)
  process.once('SIGTERM', onTerminate)

  return { stop: settle }
}
