typed-routes
============
[![Build Status](https://travis-ci.org/esperco/typed-routes.svg?branch=master)](https://travis-ci.org/esperco/typed-routes)
[![npm version](https://badge.fury.io/js/typed-routes.svg)](https://badge.fury.io/js/typed-routes)

Routes with TypeScript support.

This library is intended solely to help with pattern matching path-like
strings. It makes no assumptions about location or browser history or any
attempt to implement actual route change detection.

Usage
-----

```ts
import createRoute from "typed-routes";

// Like "/data/profiles/:userId/info" in Express
let path = createRoute()
  .extend("data", "profiles")
  .param("userId")
  .extend("info");
```

Typed routes can be matched against strings to return the extracted params
(if there's match) or to convert a params object to a param string

```ts
path.match("/data/profiles/xyz/info"); // => { userId: "xyz" }
path.match("/daat/profylez/xyz/info"); // => undefined
```

Typed routes can also convert a set of params to a string route.

```ts
path.from({ userId: "xyz" }); // => "/data/profiles/xyz/info"
path.from({ uzerid: "xyz" }); // => Type error
```

Routes may have optional types and rest types as well

```ts
let path = createRoute().param("groupId").opt("userId").rest();
path.match("/gid/uid/a/b/c");
  // => { groupId: "gid", userId: "uid", rest: ["a", "b", "c"] }
path.match("/gid");
  // => { groupId: "gid", rest: [] }
```

Routes can specify types.

```ts
import { default as createRoute, IntType } from "typed-routes";

let path = createRoute().extend("profile").param("uid", IntType);
path.match("/profile/123"); // => { uid: 123 }
path.match("/profile/abc"); // => undefined

path.from({ uid: 123 });   // => "/profile/123"
path.from({ uid: "abc" }); // => Type error
```

Types are just an object with parse and stringify functions. For example,
this is the definition of the `DateTimeParam` type, which converts a Date
to milliseconds since epoch.

```ts
const DateTimeParam = {
  parse: (s: string): Date|undefined => {
    let ret = new Date(parseInt(s));
    return isNaN(ret.getTime()) ? undefined : ret;
  },
  stringify: (d: Date): string => d.getTime().toString()
};
```

You can provide your own types for more
customized behavior (such as returning a default value is one is undefined).

API
---

### createRoute

```ts
createRoute({
  // What kind of "slash" separates paths? Defaults to "/".
  delimiter: string;

  // Require that our route starts with a certain prefix. Defaults to "/".
  prefix: string;

  // Require that our route ends with a certain suffix. Defaults to
  // empty string.
  suffix: string;
}): Route;
```

Creates a route object with certain settings.


### Route.extend

```ts
route.extend(...parts: string[]): Route;
```

Adds static segments to route that must match exactly.


### Route.param

```ts
route.param(name: string, type: ParamType = StringParam): Route;
```

Add a required parameter and optional type.


### Route.opt

```ts
route.opt(name: string, type: ParamType = StringParam): OptRoute;
```

Add an optional parameter and type. `.extend` and `.param` cannot follow
a `.opt` command.


### Route.rest

```ts
route.rest(type = StringParam): Route;
route.rest(name = "rest", type = StringParam): Route;
```

Add a field that captures multiple parts of the path as an array. Defaults
to using `rest` as the property but this can be changed. Type specifies
what kind of array we're working with (e.g. use `IntParam` or `FloatParam`
to type as `number[]`).


Built-In Param Types
--------------------

* `StrParam` - Default parameter. Types as string.

* `IntParam` - Type as integer using `parseInt`.

* `FloatParam` - Type as float using `parseFloat`.

* `DateTimeParam` - Type as Date by serializing as milliseconds since epoch.

* `ArrayParam(ParamType, delimiter = ",")` - A function that takes another
  param type and returns as param type that parses as an array of the
  original type. For instance, `ArrayParam(IntParam, "::")` will parse
  `1::2::3` as `[1, 2, 3]`.
