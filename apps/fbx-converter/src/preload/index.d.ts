import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFile: () => Promise<string | undefined>
      convertFbx: (data: { inputPath: string; options: { draco?: boolean; meshopt?: boolean } }) => Promise<{ success: boolean; path?: string; error?: string }>
    }
  }
}
