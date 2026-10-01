import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('./fixture',import.meta.url)),resolve:{alias:{'@':fileURLToPath(new URL('../../',import.meta.url))}},esbuild:{jsx:'automatic'},server:{fs:{allow:[fileURLToPath(new URL('../../',import.meta.url))]}}});
