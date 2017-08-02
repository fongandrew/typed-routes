import test = require("tape");
import {
  StrParam,
  IntParam,
  FloatParam,
  DateTimeParam,
  ArrayParam
} from "./index";

test("StrParam", (assert) => {
  assert.equals(StrParam.parse("something"), "something",
    "parses to string");
  assert.equals(StrParam.stringify("something"), "something",
    "stringifies string");
  assert.end();
});

test("IntParam", (assert) => {
  assert.equals(IntParam.parse("123.1"), 123,
    "parses to integer");
  assert.equals(IntParam.parse("x"), undefined,
    "rejects if cannot parse to integer");
  assert.equals(IntParam.stringify(123), "123",
    "stringifies integer");
  assert.end();
});

test("FloatParam", (assert) => {
  assert.equals(FloatParam.parse("123.1"), 123.1,
    "parses to float");
  assert.equals(FloatParam.parse("x"), undefined,
    "rejects if cannot parse to float");
  assert.equals(FloatParam.stringify(123.1), "123.1",
    "stringifies float");
  assert.end();
});

test("DateTimeParam", (assert) => {
  assert.deepEquals(
    DateTimeParam.parse("1234567890000"),
    new Date(1234567890000),
    "parses to Date based on milliseconds since epoch"
  );
  assert.deepEquals(
    DateTimeParam.parse("x"),
    undefined,
    "rejects if cannot parse to date"
  );
  assert.equals(
    DateTimeParam.stringify(new Date(1234567890000)),
    "1234567890000",
    "stringifies float"
  );
  assert.end();
});

test("ArrayParam", (assert) => {
  let ArrayInts = ArrayParam(IntParam, ",");
  assert.deepEquals(ArrayInts.parse("1,2,3"), [1, 2, 3],
    "parses to array of another type based on delimiter");
  assert.deepEquals(ArrayInts.parse("123"), [123],
    "parses single instance of type");
  assert.deepEquals(ArrayInts.parse(""), [],
    "parses empty array");
  assert.equals(ArrayInts.parse("1,b,3"), undefined,
    "rejects if cannot parse any array element to type");
  assert.equals(ArrayInts.stringify([1, 2, 3]), "1,2,3",
    "stringifies array");
  assert.end();
});