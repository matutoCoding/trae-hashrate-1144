import { ipcRenderer } from 'electron'

window.ipcRenderer = ipcRenderer

export function notify(title: string, body: string) {
  ipcRenderer.send('notify', title, body)
}

export async function getAppPath() {
  return await ipcRenderer.invoke('get-app-path')
}
