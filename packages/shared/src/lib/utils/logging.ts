import { inspect } from "util";

const isDevLogEnabled = process.env.SHOW_DEV_LOG === "true";

export const logObjects = (
  str: string,
  obj: any,
  overRideLogEnabled?: boolean | undefined
) => {
  if (overRideLogEnabled || isDevLogEnabled) {
    console.log(str, inspect(obj, { depth: null, colors: true }));
  }
};
export const logInfo = (str: string) => {
  // ANSI escape code for cyan text: \x1b[36m, reset: \x1b[0m
  console.log(`\x1b[36m${str}\x1b[0m`);
};
export const logError = (str: string) => {
  // ANSI escape code for red text: \x1b[31m, reset: \x1b[0m
  console.error(`\x1b[31m${str}\x1b[0m`);
};
