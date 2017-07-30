import test = require("blue-tape");
import { add } from "./index";

test("Adds up", (assert) => {
  assert.equals(add(1, 2), 3);
  assert.end();
});
