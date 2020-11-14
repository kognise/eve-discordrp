class LogParser {
  constructor(text) {
    this.lastLogLength = 0
    if (text) this.update(text)
  }

  update(text) {
    const lines = text.split('\n')

    const nameMatches = lines[2].match(/Listener: (.+)/)
    if (!nameMatches) throw new Error('Not logged in yet')
    this.name = nameMatches[1]

    const startMatches = lines[3].match(/Session Started: (.+)/)
    this.start = this.parseDate(startMatches[1])

    this.logs = lines.slice(5).map(this.parseLog.bind(this)).filter((log) => !!log)

    let changed = false
    if (this.logs.length !== this.lastLogLength) changed = true
    this.lastLogLength = this.logs.length
    
    return changed
  }

  parseLog(log) {
    const matches = log.trim().match(/^\[ (.+?) \] \((.+?)\) (.+)$/)
    if (!matches) return null
    const [ rawDate, type, content ] = matches.slice(1)

    const date = this.parseDate(rawDate)
    return { date, type, content }
  }

  parseDate(date) {
    const [
      year,
      month,
      day,
      hours,
      minutes,
      seconds
    ] = date.trim().split(/[\s\.\:]+/g)

    return new Date(Date.UTC(
      parseInt(year),
      parseInt(month - 1),
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    ))
  }
}

class GameLogParser extends LogParser {
  getState() {
    let inFleet = null
    let isDocked = false
    let dockName = null
    let systemName = null

    // Dock name
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const log = this.logs[i]

      if (log.type === 'None') {
        const undockMatches = log.content.match(/^Undocking from .+? to (.+?) solar system\.$/)
        if (undockMatches) {
          systemName = undockMatches[1]
          break
        }
      } else if (log.type === 'notify') {
        if (log.content.includes('Your docking request has been accepted.')) {
          isDocked = true
          continue
        }

        const dockMatches = log.content.match(/^Requested to dock at (.+?) station$/)
        if (isDocked && dockMatches) {
          dockName = dockMatches[1]
          systemName = dockName.split(' ')[0]
          break
        }
      }
    }

    // System name
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const log = this.logs[i]
      if (log.type !== 'None') continue

      const matches = log.content.match(/^Jumping from .+? to (.+?)$/)
      if (matches) {
        systemName = matches[1]
        break
      }
    }

    if (inFleet === null) inFleet = false

    return {
      inFleet,
      systemName,
      isDocked,
      dockName
    }
  }
}

module.exports.GameLogParser = GameLogParser