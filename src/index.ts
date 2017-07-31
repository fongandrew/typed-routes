// Required params helper type
export type ReqParams<K extends string> = {
  [P in K]: string;
};

// Optional params helper type
export type OptParams<K extends string> = {
  [P in K]?: string;
};

export type Params<R extends string, O extends string> =
  ReqParams<R> & OptParams<O>;

export interface OptRoute<
  R extends string = never, // Required params
  D extends string = never, // Params with defaults
  O extends string = never  // Optional params
> { /* tslint:disable-line:one-line */

  /*
    Add an optional part to route with an optional default. Returns an
    OptRoute (i.e. no more extend or non-optional params because optional
    params always go at the end.
  */
  opt<K extends string>(key: K, fallback: string): OptRoute<R, D|K, O>;
  opt<K extends string>(key: K): OptRoute<R, D, O|K>;

  // Returns the matching params for a given string.
  match: (path: string) => Params<R|D, O>|null;

  // Converts
  from: (params: Params<R, D|O>) => string;

  // ExpressJS-style path
  pattern: () => string;
};

export interface Route<
  R extends string = never, // Required params
  D extends string = never, // Params with defaults
  O extends string = never  // Optional params
> extends OptRoute<R, D, O> {

  // Extend route with a new part that does not correspond to some part
  extend(part: string): Route<R, D, O>;

  // Add a required param to route
  param<K extends string>(k: K): Route<R|K, D, O>;
};

// Used internally to represent a single part of path
interface Part {
  // Name of part or param
  name: string;

  // Is this a param?
  param?: boolean;

  // Is this a required param? If string, use as fallback
  required?: boolean|string;
};

// Options for routes
export interface FullRouteOpts {
  // What kind of slash separates paths?
  separator: string;

  // Leading slash expected?
  leadingSlash: boolean;

  // Trailing slash expected?
  trailingSlash: boolean;
}

export type RouteOpts = Partial<FullRouteOpts>;

const DEFAULT_ROUTE_OPTS: FullRouteOpts = {
  separator: "/",
  leadingSlash: true,
  trailingSlash: false
};

class RouteCls<
  R extends string = never,
  D extends string = never,
  O extends string = never
> implements Route<R, D, O> {
  opts: FullRouteOpts;
  parts: Part[] = [];

  constructor(part?: string, opts?: RouteOpts);
  constructor(opts?: RouteOpts);
  constructor(first?: string|RouteOpts, second?: RouteOpts) {
    if (typeof first === "string") {
      this.parts = [{ name: first }];
      this.opts = { ...DEFAULT_ROUTE_OPTS, ...(second || {}) };
    } else {
      this.opts = { ...DEFAULT_ROUTE_OPTS, ...(first || {}) };
    }
  }

  // clone (with new part)
  add(part: Part): this {
    let clone = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this
    );
    clone.parts = clone.parts.concat([part]);
    return clone;
  }

  extend(name: string): this & Route<R, D, O> {
    return this.add({ name }) as this & Route<R, D, O>;
  }

  param<K extends string>(name: K): this & Route<R|K, D, O> {
    return this.add({ name, param: true, required: true }) as (
      this & Route<R|K, D, O>
    );
  }

  opt<K extends string>(name: K, fallback: string): this & Route<R, D|K, O>;
  opt<K extends string>(name: K): this & Route<R, D, O|K>;
  opt<K extends string>(
    name: K, fallback?: string
  ): any {
    return this.add({
      name,
      param: true,
      required: typeof fallback === "string" ? fallback : false
    });
  }

  match(val: string): Params<R|D, O>|null {
    let { separator } = this.opts;
    if (
      this.opts.leadingSlash &&
      val.slice(0, separator.length) === separator
    ) {
      val = val.slice(1);
    }
    if (
      this.opts.trailingSlash &&
      val.slice(val.length - separator.length, val.length) === separator
    ) {
      val = val.slice(0, -1);
    }

    let ret: Partial<{ [K in R|D|O]: string }> = {};
    let strParts = val.split("/");
    for (let i in this.parts) {
      let expected = this.parts[i];
      let actual = strParts[i];

      // If param, assign param to key.
      if (expected.param) {
        if (actual) {
          ret[expected.name] = actual;
        } else if (typeof expected.required === "string") {
          ret[expected.name] = expected.required;
        } else if (expected.required === true) {
          return null;
        }
      }

      // Not param, return null if not exact match
      else if (actual !== expected.name) {
        return null;
      }
    }
    return ret as Params<R|D, O>;
  }

  from(params: Params<R, D|O>): string {
    let retParts: string[] = [];
    for (let i in this.parts) {
      let part = this.parts[i];
      if (part.param) {
        let val: string = (params as any)[part.name];
        if (val) {
          retParts.push(val);
        } else if (part.required === true) {
          throw new Error("Expected value for " + part.name);
        } else if (typeof part.required === "string") {
          retParts.push(part.required);
        }
      }
      else {
        retParts.push(part.name);
      }
    }
    return this.join(retParts);
  }

  pattern(): string {
    let retParts: string[] = [];
    for (let i in this.parts) {
      let { name, param, required } = this.parts[i];
      if (param) {
        name = ":" + name;
        if (required === true) {
          name = name + "?";
        }
      }
      retParts.push(name);
    }
    return this.join(retParts);
  }

  protected join(parts: string[]) {
    if (this.opts.leadingSlash) {
      parts = [""].concat(parts);
    }
    if (this.opts.trailingSlash) {
      parts = parts.concat([""]);
    }
    return parts.join(this.opts.separator);
  }
}

export interface RouteCreator {
  (part?: string, opts?: RouteOpts): Route;
  (opts?: RouteOpts): Route;
}

export const createRoute: RouteCreator = (
  first?: any,
  second?: any
): Route => new RouteCls(first, second);

export default createRoute;
