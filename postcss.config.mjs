// postcss.config.mjs
import tailwindcssAnimate from 'tailwindcss-animate'
import tailwindcssForms from '@tailwindcss/forms'
import tailwindcssTypography from '@tailwindcss/typography'

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      plugins: [
        tailwindcssAnimate,
        tailwindcssForms,
        tailwindcssTypography,
      ],
    },
  },
}

export default config