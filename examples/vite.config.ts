import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // resolve:{
  //   alias: {
  //     '@webinargeek/machine-component': '../../packages/machine-component/src/index.ts'
  //   }
  // }
})
