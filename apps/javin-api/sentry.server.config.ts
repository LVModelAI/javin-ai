// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0a78404e54c40efcef3bb2e9eac63137@o4509105561468928.ingest.us.sentry.io/4509146325450752",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  beforeSend(event) {
    if (event.request?.url?.includes("localhost")) {
      console.log("Not sending event to sentry because it is from localhost");
      return null; // Drop the event
    }
    return event;
  },
});
