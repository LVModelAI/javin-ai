import { inspect } from "util";

export const logObjects = (str: string, obj: any) => {
  console.log(str, inspect(obj, { depth: null, colors: true }));
};

export const logInfo = (str: string) => {
  // ANSI escape code for cyan text: \x1b[36m, reset: \x1b[0m
  console.log(`\x1b[36m${str}\x1b[0m`);
};
export const logError = (str: string) => {
  // ANSI escape code for red text: \x1b[31m, reset: \x1b[0m
  console.error(`\x1b[31m${str}\x1b[0m`);
};
