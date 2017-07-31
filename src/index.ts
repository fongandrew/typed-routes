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

// Used internally to represent a single part of path
export interface Part {
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

/*
  Base class for Route. Not created directly but with the opt method of a
  Route. Once a Route becomes an OptRoute, it loses its ability to add
  required params and other parts.
*/
export class OptRoute<
  R extends string = never,
  D extends string = never,
  O extends string = never
> { /* tslint:disable-line:one-line */
  opts: FullRouteOpts;
  parts: Part[] = [];

  // clone (with new part)
  protected add<P extends typeof OptRoute>(part: Part, proto: P): P {
    return Object.create(proto, {
      opts: {
        value: this.opts
      },
      parts: {
        value: this.parts.concat([part])
      }
    });
  }

  /*
    Add an optional part to route with an optional default. Returns an
    OptRoute (i.e. no more extend or non-optional params because optional
    params always go at the end.
  */
  opt<K extends string>(key: K, fallback: string): OptRoute<R, D|K, O>;
  opt<K extends string>(key: K): OptRoute<R, D, O|K>;
  opt<K extends string>(
    name: K, fallback?: string
  ): any {
    return this.add({
      name,
      param: true,
      required: typeof fallback === "string" ? fallback : false
    }, OptRoute);
  }

  // Returns the matching params for a given string.
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

  // Converts param objects to string
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

  // ExpressJS-style path
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

  // Helper function that adds leading and trailing separators
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

/*
  Chainable method for creating routes.
*/
export class Route<
  R extends string = never,
  D extends string = never,
  O extends string = never
> extends OptRoute<R, D, O> {
  opts: FullRouteOpts;
  parts: Part[] = [];

  constructor(part?: string, opts?: RouteOpts);
  constructor(opts?: RouteOpts);
  constructor(first?: string|RouteOpts, second?: RouteOpts) {
    super();
    if (typeof first === "string") {
      this.parts = [{ name: first }];
      this.opts = { ...DEFAULT_ROUTE_OPTS, ...(second || {}) };
    } else {
      this.opts = { ...DEFAULT_ROUTE_OPTS, ...(first || {}) };
    }
  }

  // Extend route with a new part that does not correspond to some part
  extend(name: string): this {
    return this.add({ name }, Object.getPrototypeOf(this));
  }

  // Add a required param to route
  param<K extends string>(name: K): this & Route<R|K, D, O> {
    return this.add(
      { name, param: true, required: true },
      Object.getPrototypeOf(this)
    ) as this & Route<R|K, D, O>;
  }
}


/* Syntactic sugar for not having to write "new" */

export interface RouteCreator {
  (part?: string, opts?: RouteOpts): Route;
  (opts?: RouteOpts): Route;
}

export const createRoute: RouteCreator = (
  first?: any,
  second?: any
): Route => new Route(first, second);

export default createRoute;