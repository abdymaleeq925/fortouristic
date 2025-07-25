import { reactRouter } from "@react-router/dev/vite";
import basicSsl from '@vitejs/plugin-basic-ssl'
import { sentryReactRouter, type SentryReactRouterBuildOptions } from "@sentry/react-router";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const sentryConfig: SentryReactRouterBuildOptions = {
  org: "js-mastery-xo",
  project: "fortouristic",
  // An auth token is required for uploading source maps;
  // store it in an environment variable to keep it secure.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // ...
};

export default defineConfig(config => {
  return {
  plugins: [tailwindcss(), tsconfigPaths(), reactRouter(), sentryReactRouter (sentryConfig, config), basicSsl()],
  sentryConfig,
  ssr: {
    noExternal: [/@syncfusion/]
  }}
});
