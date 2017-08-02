import { ParamType, StrParam } from "./param-types";

// Helper functions for extending mmap types
export type MapParam<K extends string, T> = { [P in K]: T };
export type OptParam<K extends string, T> = { [P in K]?: T };

/*
  Internal types for representing parts of path
*/

export interface Param<T = string> {
  type: "PARAM";
  name: string;
  required: boolean;
  paramType: ParamType<T>;
}

export interface RestParam<T = string> {
  type: "REST";
  name: string;
  paramType: ParamType<T>;
}

// NB: string = match exactly
export type Part = string|Param<any>|RestParam<any>;

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
  Base class for OptRoute and Route. Not created directly but with the rest
  method of OptRoute and Route. Once a Route or OptRoute becomes an RestRoute,
  it loses its ability to add additional params.
*/
export class RestRoute<
  P = {} // Type of params when converting to params from string
> { /* tslint:disable-line */
  opts: FullRouteOpts;
  parts: Part[] = [];

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
      let actual = strParts.shift();

      // If param, assign param to key.
      if (typeof expected !== "string") {
        let { paramType, name } = expected;

        // Rest params consume remainder
        if (expected.type === "REST") {
          let rest: any[] = (ret as any)[name] = [];
          while (actual) {
            let v = paramType.parse(actual);
            if (v === void 0) {
              return undefined;
            }
            rest.push(v);
            actual = strParts.shift();
          }
        }

        // Parse single param
        else {
          let v = actual && paramType.parse(actual);
          if (expected.required && v === void 0) {
            return undefined;
          } else {
            ret[name] = v;
          }
        }
      }

      // Not param, return null if not exact match
      else if (actual !== expected) {
        return undefined;
      }
    }

    // Did not match all parts, reject
    if (strParts.length) return undefined;

    return ret as P;
  }

  // Converts param objects to string
  from(params: P): string {
    let retParts: string[] = [];
    for (let i in this.parts) {
      let part = this.parts[i];
      if (typeof part === "string") {
        retParts.push(part);
      } else if (part.type === "REST") {
        let val = (params as any)[part.name];
        if (val instanceof Array) {
          for (let i in val) {
            retParts.push(part.paramType.stringify(val[i]));
          }
        } else {
          throw new Error("Expected array for " + part.name);
        }
      } else {
        let val = (params as any)[part.name];
        if (val !== void 0) {
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
      } else if (part.type === "REST") {
        retParts.push("*")
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
}

/*
  Base class for Route. Not created directly but with the opt method of a
  Route. Once a Route becomes an OptRoute, it loses its ability to add
  required params and other parts.
*/
export class OptRoute<P = {}> extends RestRoute<P> { /* tslint:disable-line */

  // clone (with new part)
  protected add<
    R extends RestRoute,
    O extends typeof RestRoute
  > (part: Part, proto: O): R {
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
    Add an optional part to route. Returns an OptRoute (i.e. no more extend or
    non-optional params because optional params always follows string and
    required params.
  */
  opt<K extends string, T = string>(
    name: K,
    paramType?: ParamType<T>
  ): OptRoute<P & OptParam<K, T>> {
    return this.add({
      type: "PARAM",
      name,
      required: false,
      paramType: paramType || StrParam
    }, OptRoute);
  }

  /*
    Add a remainder capture to route. Returns a RestRoute (i.e. no more params
    or anything else because remaidner is always a the end)
  */
  rest<K extends string, T = string>(
    paramType?: ParamType<T>
  ): RestRoute<P & MapParam<"rest", T[]>>;
  rest<K extends string, T = string>(
    name: K,
    paramType?: ParamType<T>
  ): RestRoute<P & MapParam<K, T[]>>;
  rest<K extends string, T = string>(
    first?: K|ParamType<T>,
    second?: ParamType<T>
  ): RestRoute<P & MapParam<K, T[]>> {
    let name: K|undefined;
    let paramType: ParamType<T>|undefined;
    if (typeof first === "string") {
      name = first;
      if (second) {
        paramType = second;
      }
    } else if (first) {
      paramType = first;
    }
    return this.add({
      type: "REST",
      name: name || "rest",
      paramType: paramType || StrParam
    }, RestRoute);
  }
}

/*
  Chainable method for creating routes.
*/
export class Route<P = {}> extends OptRoute<P> { /* tslint:disable-line */
  opts: FullRouteOpts;
  parts: Part[] = [];

  constructor(opts: RouteOpts = {}) {
    super();
    this.opts = { ...DEFAULT_ROUTE_OPTS, ...opts };
  }

  // Extend route with a new part that does not correspond to some part
  extend(...names: string[]): this {
    let t = this;
    let proto = Object.getPrototypeOf(this);
    for (let i in names) {
      t = t.add(names[i], proto);
    }
    return t;
  }

  // Add a required param to route
  param<K extends string, T = string>(
    name: K,
    paramType?: ParamType<T>
  ): Route<P & MapParam<K, T>> {
    return this.add({
      type: "PARAM",
      name,
      required: true,
      paramType: paramType || StrParam
    }, Route);
  }
}


/* Syntactic sugar for not having to write "new" */
export const createRoute = (opts: RouteOpts = {}) => new Route(opts);

export default createRoute;