import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { convertFbxToGlb, optimizeGlb } from '@repo/converter-core'
import fs from 'fs/promises'

// Set unique userData path for dev to avoid cache lock issues
if (is.dev) {
  const devDataPath = join(process.cwd(), '.electron-cache');
  app.setPath('userData', devDataPath);
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    show: true, // 强制显示以便排除 ready-to-show 未触发的情况
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b',
      symbolColor: '#71717a',
      height: 32
    },
    icon: is.dev 
      ? join(process.cwd(), 'resources/icon/favicon.ico')
      : join(process.resourcesPath, 'icon/favicon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false
    }
  })

  // mainWindow.on('ready-to-show', () => {
  //   mainWindow.show()
  // })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    console.log('Loading URL:', process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.fbx.converter')

  // Add bin directory to PATH so gltf-transform can find toktx
  const binDir = is.dev 
    ? join(process.cwd(), 'resources/bin')
    : join(process.resourcesPath, 'bin');
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
  process.env[pathKey] = `${binDir}${process.platform === 'win32' ? ';' : ':'}${process.env[pathKey]}`;

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('convert-fbx', async (_, { inputPath, options, outputDir }) => {
    try {
      // 1. Determine paths
      const fileName = inputPath.split(/[\\/]/).pop()!.replace(/\.fbx$/i, '');
      const targetDir = outputDir || inputPath.substring(0, inputPath.lastIndexOf(process.platform === 'win32' ? '\\' : '/'));
      
      const tempGlbPath = join(targetDir, `${fileName}.temp.glb`);
      const finalGlbPath = join(targetDir, `${fileName}.glb`);

      const binaryName = process.platform === 'win32' ? 'FBX2glTF.exe' : 'FBX2glTF';
      
      const binDir = is.dev 
        ? join(process.cwd(), 'resources/bin')
        : join(process.resourcesPath, 'bin');
      const fbx2gltfPath = join(binDir, binaryName);
      const toktxPath = join(binDir, process.platform === 'win32' ? 'toktx.exe' : 'toktx');

      // 2. Convert FBX to GLB
      await convertFbxToGlb(fbx2gltfPath, inputPath, tempGlbPath);

      // 3. Optimize GLB if requested
      const buffer = await fs.readFile(tempGlbPath);
      const optimizedBuffer = await optimizeGlb(buffer, options, toktxPath);

      // 4. Write final file
      await fs.writeFile(finalGlbPath, optimizedBuffer);
      
      // Cleanup temp
      await fs.unlink(tempGlbPath);

      return { success: true, path: finalGlbPath };
    } catch (error: any) {
      console.error('Conversion failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'FBX Files', extensions: ['fbx'] }]
    });
    return result.filePaths;
  });

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    
    // Scan for FBX files in the folder
    const folderPath = result.filePaths[0];
    const files = await fs.readdir(folderPath, { recursive: true });
    return files
      .filter(f => f.toLowerCase().endsWith('.fbx'))
      .map(f => join(folderPath, f));
  });

  ipcMain.handle('select-output-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });
    return result.filePaths[0];
  });

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    
    const dirPath = result.filePaths[0];
    const files = await fs.readdir(dirPath);
    const fbxFiles = files
      .filter(f => f.toLowerCase().endsWith('.fbx'))
      .map(f => join(dirPath, f));
    
    return { path: dirPath, files: fbxFiles };
  });

  ipcMain.on('open-folder', (_, filePath) => {
    shell.showItemInFolder(filePath);
  });

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
