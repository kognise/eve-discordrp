const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs')
const psList = require('ps-list')

module.exports.getSystemInfo = async (rawName) => {
  const idRes = await fetch('https://esi.evetech.net/latest/universe/ids/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([ rawName.trim() ])
  })
  const idJson = await idRes.json()
  const { id } = idJson.systems[0]

  const systemRes = await fetch(`https://esi.evetech.net/latest/universe/systems/${encodeURIComponent(id)}/`)
  const { name, security_status: securityStatus } = await systemRes.json()

  return { name, securityStatus, id }
}

module.exports.getMostRecentFile = (dirPath) => {
  const files = fs.readdirSync(dirPath)
  
  const sorted = files.map((file) => {
    const filePath = path.join(dirPath, file)
    return {
      name: file,
      time: fs.statSync(filePath).mtime.getTime()
    }
  }).sort((a, b) => b.time - a.time)
    .map((info) => info.name)

  return sorted[0] || null
}

module.exports.isEveRunning = async () => {
  const processes = await psList()
  return processes.some((process) => process.name === 'eve_crashmon.exe')
}