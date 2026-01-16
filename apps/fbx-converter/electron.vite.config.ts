import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@silverstr1ng/servo-core']
      }),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/draco3dgltf/*.wasm',
            dest: '.'
          }
        ]
      })
    ],
    build: {
      rollupOptions: {
        external: ['draco3dgltf', 'meshoptimizer', 'sharp']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src')
      }
    },
    plugins: [svelte()]
  }
})
