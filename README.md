TS Boilerplate
==============
[![Build Status](https://travis-ci.org/esperco/typed-routes.svg?branch=master)](https://travis-ci.org/esperco/typed-routes)

Routes with TypeScript support.

This library is intended solely to help with pattern matching path-like
strings. It makes no assumptions about location or browser history or any
attempt to implement actual route change detection.

Usage
-----

```ts
import createRoute from "typed-routes";

let path = createRoute("data")
  .extend("profiles")
  .param("groupId")
  .opt("userId", "defaultId");

/*
  Typed routes can be matched against strings to return the extracted params
  (if there's match) or to convert a params object to a param string
*/
path.match("/data/profiles/123/xyz"); // => { groupId: "123", userId: "xyz" }
path.match("/data/profiles/123"); // => { groupId: "123", userId: "defaultId" }
path.match("/daat/profylez/123"); // => null

/*
  Typed routes can also convert a set of params to a string route.
*/
path.from({ groupId: "123", userId: "xyz" }); // => "/data/profiles/123/xyz"
path.from({ groupId: "123" }); // => "/data/profiles/123"
path.from({ groopid: "123" }); // => Type error

/*
  Typed routes can be used to generate ExpressJS style paths.
*/
path.pattern(); // => "/data/profiles/:groupId/:userId?
```
