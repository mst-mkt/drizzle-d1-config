import { defineConfig } from 'vite-plus'

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'vp pack',
      },
      dev: {
        command: 'vp pack --watch',
      },
    },
  },
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    entry: ['./src/local.ts', './src/http.ts', './src/load-typescript-config.ts'],
    format: ['esm'],
    dts: { tsgo: true },
    clean: true,
    platform: 'node',
    exports: {
      customExports: (exports) => {
        const { './load-typescript-config': _, ...rest } = exports
        return rest
      },
    },
    deps: { alwaysBundle: ['@std/jsonc', '@std/toml'] },
  },
  fmt: {
    ignorePatterns: ['dist/**', '.changeset/**', 'CHANGELOG.md'],
    semi: false,
    singleQuote: true,
    sortImports: {},
    sortPackageJson: { sortScripts: false },
  },
  lint: {
    plugins: ['import', 'vitest'],
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ['dist/**'],
    rules: {
      'no-unused-vars': 'warn',
      'typescript/consistent-type-imports': 'warn',
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
