import { inspect } from "util";

export const logObjects = (str: string, obj: any) => {
  console.log(str, inspect(obj, { depth: null, colors: true }));
};
