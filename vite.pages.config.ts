import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 root:fileURLToPath(new URL('./pages',import.meta.url)),
 base:'/TEKEL/',
 publicDir:fileURLToPath(new URL('./public',import.meta.url)),
 plugins:[react()],
 build:{outDir:fileURLToPath(new URL('./outputs/pages',import.meta.url)),emptyOutDir:true},
});
