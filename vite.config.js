import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A relative base makes the build work from https://USER.github.io/REPOSITORY/
// without hard-coding the repository name.
export default defineConfig({
  base: './',
  plugins: [react()],
});
