import * as Sentry from "@sentry/react-router";

Sentry.init({
  dsn: "https://8d15d3aca85b07a0019b4af5b344fdd6@o4509566336040960.ingest.de.sentry.io/4509566337941584",

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
