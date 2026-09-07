const path = require("path");

// The tailwindcss plugin looks for tailwind.config.js starting from the
// process working directory. When Next is started from the monorepo
// root (`next dev apps/web`) that search misses this app's config
// entirely and Tailwind falls back to an empty `content`, which fails
// the build with a misleading "the `border-border` class does not
// exist". Naming the config path explicitly makes it cwd-independent.
module.exports = {
  plugins: {
    tailwindcss: { config: path.join(__dirname, "tailwind.config.js") },
    autoprefixer: {},
  },
};
