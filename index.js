if (require('electron-squirrel-startup')) process.exit(0)

const RPC = require('discord-rpc')
const fs = require('fs')
const path = require('path')
const { app, Menu, Tray } = require('electron')
const { getSystemInfo, getMostRecentFile, isEveRunning } = require('./util')
const { GameLogParser } = require('./parser')

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) process.exit(0)

app.setLoginItemSettings({ openAtLogin: true })

const basePath = path.join(app.getPath('documents'), 'EVE', 'logs', 'Gamelogs')
const clientId = '777044787924041738'

const parser = new GameLogParser()
const rpc = new RPC.Client({ transport: 'ipc' })

let tray

const updateMenu = (status) => {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'EVE Discord Presence', type: 'normal', enabled: false },
    { label: `Status: ${status}`, type: 'normal', enabled: false },
    { type: 'separator' },
    { label: 'Quit', type: 'normal', click: () => process.exit(0) }
  ])

  if (tray) tray.setContextMenu(contextMenu)
}

const setRpc = async () => {
  if (!await isEveRunning()) {
    await rpc.clearActivity()
    updateMenu('Idle')
    return
  }

  try {
    const file = getMostRecentFile(basePath)
    const dirPath = path.join(basePath, file)

    const text = fs.readFileSync(dirPath).toString()
    const changed = parser.update(text)
    if (!changed) return

    const state = parser.getState()
    const info = state.systemName && await getSystemInfo(state.systemName)
    const securityStatus = info && info.securityStatus.toFixed(1)

    await rpc.setActivity({
      details: state.inFleet
        ? `${parser.name}, in a fleet`
        : `${parser.name}`,

      state: state.isDocked
        ? `Docked at ${state.dockName || (info ? `unknown station in ${info.name}` : 'unknown station')}`
        : `Flying in ${info ? info.name : 'unknown system'}`,
      
      startTimestamp: parser.start,
      largeImageKey: 'cover-logo',
      largeImageText: info ? info.name : 'Unknown System',

      smallImageKey: securityStatus ? `${securityStatus.replace(/\./g, '_')}_status` : undefined,
      smallImageText: securityStatus ? `${securityStatus} Security` : undefined,

      instance: false
    })

    updateMenu(info ? info.name : 'Unknown system')
  } catch {
    updateMenu('Waiting for user')
    await rpc.clearActivity()
  }
}

rpc.on('ready', async () => {
  console.log('Authed for user', rpc.user.username)

  await setRpc()
  setInterval(() => setRpc(), 1000)
})

rpc.login({ clientId })

app.whenReady().then(() => {
  tray = new Tray(path.join(__dirname, 'images', 'tray-icon.png'))
  
  tray.setToolTip('EVE Discord Presence')
  tray.on('click', () => tray.popUpContextMenu())
  updateMenu('RPC connecting')
})