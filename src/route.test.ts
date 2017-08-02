import test = require("tape");
import createRoute, { IntParam } from "./index";


test("route with exact paths", (assert) => {
  let route = createRoute().extend("a", "b").extend("c");

  assert.deepEquals(route.match("/a/b/c"), {},
    "returns object on exact match");

  assert.equals(route.match("/a/b"), undefined,
    "returns undefined for incomplete matches");

  assert.equals(route.match("/a/b/c/"), undefined,
    "returns undefined for over-match");

  assert.deepEquals(route.from({}), "/a/b/c",
    "returns exact path with from method");

  assert.end();
});


test("with params", (assert) => {
  let route = createRoute()
    .extend("path", "to")
    .param("param1")
    .param("param2");

  assert.deepEquals(route.match("/path/to/abc/def"), {
    param1: "abc",
    param2: "def"
  }, "returns object with extracted strings on match");

  assert.equals(route.match("/path/to/abc"), undefined,
    "returns undefined for incomplete matches");

  assert.equals(route.match("/path/to/abc/def/ghi"), undefined,
    "returns undefined for over-match");

  assert.equals(route.from({
    param1: "abc",
    param2: "def"
  }), "/path/to/abc/def", "stringfies params with from method");

  assert.equals(route.toString(), "/path/to/:param1/:param2",
    "returns ExpressJS-like pattern on toString");

  assert.end();
});


test("with optional params", (assert) => {
  let route = createRoute()
    .extend("path", "to")
    .param("param1")
    .opt("param2");

  assert.deepEquals(route.match("/path/to/abc/def"), {
    param1: "abc",
    param2: "def"
  }, "returns object with extracted strings if matching optional params");

  assert.deepEquals(route.match("/path/to/abc"), {
    param1: "abc"
  }, "returns object with extracted strings even " +
     "if optional params don't match");

  assert.equals(route.match("/path/to/abc/def/ghi"), undefined,
    "returns undefined for over-match");

  assert.equals(route.from({
    param1: "abc",
    param2: "def"
  }), "/path/to/abc/def", "stringfies optional params with from method");

  assert.equals(route.from({
    param1: "abc"
  }), "/path/to/abc", "stringfies without optional params with from method");

  assert.equals(route.toString(), "/path/to/:param1/:param2?",
    "returns ExpressJS-like pattern on toString");

  assert.end();
});


test("with rest params", (assert) => {
  let route = createRoute()
    .extend("path", "to")
    .opt("param1")
    .rest();

  assert.deepEquals(route.match("/path/to/abc/def/ghi"), {
    param1: "abc",
    rest: ["def", "ghi"]
  }, "returns object with rest pointing to string arrays if matching");

  assert.deepEquals(route.match("/path/to"), {
    rest: []
  }, "returns empty list if nothing to extract but otherwise valid");

  assert.deepEquals(route.match("/path/from"), undefined,
    "returns undefined if not matching");

  assert.deepEquals(route.from({
    param1: "abc",
    rest: ["def", "ghi"]
  }), "/path/to/abc/def/ghi", "stringfies rest params with from method");

  assert.deepEquals(route.from({
    rest: []
  }), "/path/to", "doesn't stringify empty array with from method");

  assert.deepEquals(route.toString(), "/path/to/:param1?/*",
    "returns ExpressJS-like pattern on toString");

  assert.end();
});


test("with typed params", (assert) => {
  let route = createRoute()
    .extend("a")
    .param("b", IntParam)
    .opt("c", IntParam)
    .rest(IntParam);

  assert.deepEquals(route.match("/a/1/2/3/4/5"), {
    b: 1,
    c: 2,
    rest: [3, 4, 5]
  }, "Converts to type when matching");

  assert.deepEquals(route.match("/a/1"), {
    b: 1,
    rest: []
  }, "Preserves opt- and rest-param behavior when matching");

  assert.equals(route.match("/a/b/2/3/4/5"), undefined,
    "Rejects paths that don't match type conversion");

  assert.equals(route.match("/a/1/c/3/4/5"), undefined,
    "Rejects paths that fail opt type conversion");

  assert.equals(route.match("/a/1/2/3/e/5"), undefined,
    "Rejects paths that don't match rest type conversion");

  assert.end();
});


test("with named rest params", (assert) => {
  let route1 = createRoute().rest("letters");
  assert.deepEquals(route1.match("/a/b/c"), {
    letters: ["a", "b", "c"]
  }, "uses name for rest array");

  let route2 = createRoute().rest("numbers", IntParam);
  assert.deepEquals(route2.match("/1/2/3"), {
    numbers: [1, 2, 3]
  }, "uses name for typed rest array");

  assert.end();
});


test("with custom prefix", (assert) => {
  let route = createRoute({ prefix: "/#!/" }).extend("a").param("b");

  assert.deepEquals(route.match("/#!/a/c"), {
    b: "c"
  }, "matches paths with prefix");

  assert.equals(route.match("/a/c"), undefined, "rejects paths without prefix");

  assert.equals(route.from({
    b: "c"
  }), "/#!/a/c", "returns path with prefix with from method");

  assert.equals(route.toString(), "/#!/a/:b", "includes prefix in toString");

  assert.end();
});


test("with empty prefix", (assert) => {
  let route = createRoute({ prefix: "" }).extend("a").param("b");

  assert.deepEquals(route.match("a/c"), {
    b: "c"
  }, "matches paths without prefix");

  assert.equals(route.match("/a/c"), undefined, "rejects paths with prefix");

  assert.equals(route.from({
    b: "c"
  }), "a/c", "returns path without prefix with from method");

  assert.end();
});


test("allows custom suffix", (assert) => {
  let route = createRoute({ suffix: "?x=1" }).extend("a").param("b");

  assert.deepEquals(route.match("/a/c?x=1"), {
    b: "c"
  }, "matches paths with suffix");

  assert.equals(route.match("/a/c"), undefined, "rejects paths without suffix");

  assert.equals(route.from({
    b: "c"
  }), "/a/c?x=1", "returns path with suffix with from method");

  assert.equals(route.toString(), "/a/:b?x=1", "includes suffix in toString");

  assert.end();
});


test("allows custom delimiter", (assert) => {
  let route = createRoute({ delimiter: "." })
    .extend("a")
    .param("b")
    .rest(IntParam);

  assert.deepEquals(route.match("/a.c.1.2.3"), {
    b: "c",
    rest: [1, 2, 3]
  }, "matches path using custom delimiter");

  assert.equals(route.from({
    b: "c",
    rest: [1, 2, 3]
  }), "/a.c.1.2.3", "Uses custom delimiter when stringifying with from");

  assert.end();
});