#!/bin/sh
# bundle src/ into game.js (uses esbuild + three from ../bolt-dash/node_modules)
cd "$(dirname "$0")" && node --input-type=module -e "import('../bolt-dash/node_modules/esbuild/lib/main.js').then(({build})=>build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', outfile: 'game.js', target: 'es2020', alias: { 'three/addons': 'three/examples/jsm' }, nodePaths: ['../bolt-dash/node_modules'], logLevel: 'warning' }))"
