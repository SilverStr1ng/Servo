import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  convertFbx: (data: { inputPath: string; options: any; outputDir?: string }) => ipcRenderer.invoke('convert-fbx', data),
  openFolder: (path: string) => ipcRenderer.send('open-folder', path)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
