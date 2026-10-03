# Texloom runtime distribution

Texloom's source repository is private. This public site vendors only the
compiled browser runtime and generated TypeScript declarations needed to build
and display its figures. Builds do not need private GitHub credentials.

- Source revision: `a4969ac50b86351fa5560063365e86907b0c4581`
- Archive: `texloom-0.3.0-a4969ac.tgz`
- SHA-256: `33b48e5d176698e54027ad9f14d4b6aadba69fec76d5733e3deebd784413d22e`
- `texloom-provenance.json` records exact tool versions and every runtime/type file hash.
- `package-lock.json` records the installed archive's SHA-512 integrity.

The archive contains minified ESM, type declarations and package/provenance
metadata. It contains no implementation TypeScript, TeX compilers, source maps,
tests, private documentation or lifecycle installation scripts.

To update from an authorized clean Texloom checkout:

```sh
node tools/build-lemniro-package.mjs build/lemniro-package
npm pack ./build/lemniro-package --pack-destination build
```

Use a new empty build directory for each invocation. Copy the resulting archive
here with the source revision in its name, copy its provenance, run
`npm install --save-exact ./vendor/<archive>.tgz`, and update this record. Verify
the byte-identical result of a second build with the same recorded toolchain.
Review and commit the archive, provenance and lockfile together.

`npm run verify:runtime` checks the archive against the lockfile, the installed
provenance against this checked-in copy, and all generated file hashes. The
ordinary site verification includes this check.
