import { ParamType, StrParam } from "./param-types";

export interface Param<T = string> {
  name: string;
  required: boolean;
  paramType: ParamType<T>;
};

export type MapParam<K extends string, T> = { [P in K]: T };
export type OptParam<K extends string, T> = { [P in K]?: T };

/*
  Used internally to represent a single part of path.
  * String = simple part, needs to match exactly
  * Object = param
*/
export type Part = string|Param<any>;

// Options for routes
export interface FullRouteOpts {
  // What kind of "slash" separates paths?
  delimiter: string;

  // What does path start with?
  prefix: string;

  // What does path endwith
  suffix: string;
}

export type RouteOpts = Partial<FullRouteOpts>;

const DEFAULT_ROUTE_OPTS: FullRouteOpts = {
  delimiter: "/",
  prefix: "/",    // Leading slash
  suffix: ""      // No trailing slash
};

/*
  Base class for Route. Not created directly but with the opt method of a
  Route. Once a Route becomes an OptRoute, it loses its ability to add
  required params and other parts.
*/
export class OptRoute<
  P = {} // Type of params when converting to params from string
> {
  opts: FullRouteOpts;
  parts: Part[] = [];

  // clone (with new part)
  protected add<
    R extends OptRoute,
    C extends typeof OptRoute
  > (part: Part, proto: C): R {
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
  opt<K extends string, T = string>(
    name: K,
    paramType?: ParamType<T>
  ): OptRoute<P & OptParam<K, T>> {
    return this.add({
      name,
      required: false,
      paramType: paramType || StrParam
    }, OptRoute);
  }

  // Returns the matching params for a given string. Undefined if no match.
  match(val: string): P|undefined {
    let { delimiter, prefix, suffix } = this.opts;
    if (val.slice(0, prefix.length) === prefix) {
      val = val.slice(prefix.length);
    } else {
      return undefined;
    }

    if (val.slice(val.length - suffix.length, val.length) === suffix) {
      val = val.slice(0, -suffix.length);
    } else {
      return undefined;
    }

    let ret: Partial<P> = {};
    let strParts = val.split(delimiter);
    for (let i in this.parts) {
      let expected = this.parts[i];
      let actual = strParts[i];

      // If param, assign param to key.
      if (typeof expected !== "string") {
        let val = expected.paramType.parse(actual);
        if (expected.required && val === void 0) {
          return undefined;
        } else {
          ret[expected.name] = val;
        }
      }

      // Not param, return null if not exact match
      else if (actual !== expected) {
        return undefined;
      }
    }

    return ret as P;
  }

  // Converts param objects to string
  from(params: P): string {
    let retParts: string[] = [];
    for (let i in this.parts) {
      let part = this.parts[i];
      if (typeof part === "string") {
        retParts.push(part);
      } else {
        let val = (params as any)[part.name];
        if (val === void 0) {
          retParts.push(part.paramType.stringify(val));
        } else if (part.required === true) {
          throw new Error("Expected value for " + part.name);
        }
      }
    }
    return this.join(retParts);
  }

  // ExpressJS-style path
  toString(): string {
    let retParts: string[] = [];
    for (let i in this.parts) {
      let part = this.parts[i];
      if (typeof part === "string") {
        retParts.push(part);
      } else {
        retParts.push(":" + part.name + (part.required ? "" : "?"));
      }
    }
    return this.join(retParts);
  }

  // Helper function that adds leading and trailing delimiters
  protected join(parts: string[]) {
    let { prefix, suffix, delimiter } = this.opts;
    return prefix + parts.join(delimiter) + suffix;
  }
};

/*
  Chainable method for creating routes.
*/
export class Route<P = {}> extends OptRoute<P> { /* tslint:disable-line */
  opts: FullRouteOpts;
  parts: Part[] = [];

  constructor(part?: string, opts?: RouteOpts);
  constructor(opts?: RouteOpts);
  constructor(first?: string|RouteOpts, second?: RouteOpts) {
    super();
    if (typeof first === "string") {
      this.parts = [first];
      this.opts = { ...DEFAULT_ROUTE_OPTS, ...(second || {}) };
    } else {
      this.opts = { ...DEFAULT_ROUTE_OPTS, ...(first || {}) };
    }
  }

  // Extend route with a new part that does not correspond to some part
  extend(name: string): this {
    return this.add(name, Object.getPrototypeOf(this));
  }

  // Add a required param to route
  param<K extends string, T = string>(
    name: K,
    paramType?: ParamType<T>
  ): Route<P & MapParam<K, T>> {
    return this.add({
      name,
      required: true,
      paramType: paramType || StrParam
    }, Route);
  }
};


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