/*
  Structures for basic param typing
*/

// Base param type
export interface ParamType<T> {
  // Convert string to param type. May return undefined if type is invalid.
  parse(s: string): T|undefined;

  // Convert param to string, for use in path
  stringify(t: T): string;
}

export const StrParam: ParamType<string> = {
  parse: (s) => s,
  stringify: (t) => t
};

export const IntParam: ParamType<number> = {
  parse: (s) => {
    let ret = parseInt(s);
    return isNaN(ret) ? undefined : ret;
  },
  stringify: (t) => t.toString()
};

export const FloatParam: ParamType<number> = {
  parse: (s) => {
    let ret = parseFloat(s);
    return isNaN(ret) ? undefined : ret;
  },
  stringify: (t) => t.toString()
};

export const DateTimeParam: ParamType<Date> = {
  parse: (s) => {
    let ret = new Date(s);
    return isNaN(ret.getTime()) ? undefined : ret;
  },
  stringify: (d) => d.getTime().toString()
};

export const ArrayParam = <T>(
  p: ParamType<T>,
  delimiter = ","
): ParamType<T[]> => ({
  parse: (s) => {
    let ret: T[] = [];
    let parts = s.split(delimiter);
    for (let i in parts) {
      let t = p.parse(parts[i]);
      if (t === void 0) return undefined;
      ret.push(t);
    }
    return ret;
  },
  stringify: (t): string => {
    let ret: string[] = [];
    for (let i in t) {
      ret.push(p.stringify(t[i]));
    }
    return ret.join(delimiter);
  }
});