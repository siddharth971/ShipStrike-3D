import glsl from 'vite-plugin-glsl';

export default {
  base: '/threejs-water-shader/',
  build: {
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          ui: ['tweakpane']
        }
      }
    }
  },
  plugins: [glsl()]
} 