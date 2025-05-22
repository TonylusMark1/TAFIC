import * as TSUP from 'tsup';

//

export default TSUP.defineConfig([
    {
        entry: ['src/index.ts'],
        outDir: 'dist/esm',
        format: ['esm'],
        dts: true,
        sourcemap: true,
        clean: true,
        splitting: false,
        shims: false,
        esbuildOptions(options) {
            options.platform = 'neutral';
        }
    },
    {
        entry: ['src/index.ts'],
        outDir: 'dist/cjs',
        format: ['cjs'],
        dts: true,
        sourcemap: true,
        clean: false,
        splitting: false,
        shims: false,
        esbuildOptions(options) {
            options.platform = 'node';
        }
    }
]);