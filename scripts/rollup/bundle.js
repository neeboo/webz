import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import packages from '../packages'
import babelConfig from '../babel/babel.config.js'

function formatPackagesSettings() {
  return packages.map((p) => {
    return {
      input: `packages/${p}/src/index.js`,
      output: {
        file: `packages/${p}/lib/index.js`,
        format: 'cjs'
      },
      plugins: [babel(babelConfig), commonjs()]
    }
  })
}

export default formatPackagesSettings()
