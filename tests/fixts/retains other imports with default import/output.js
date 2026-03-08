import { resetCaches } from "graphql-tag";

const query = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "foo" },
      variableDefinitions: [],
      directives: [],
      selectionSet: {
        kind: "SelectionSet",
        selections: [{ kind: "Field", name: { kind: "Name", value: "bar" }, arguments: [], directives: [] }],
      },
    },
  ],
  loc: {
    start: 0,
    end: 27,
    source: {
      body: "\n  query foo {\n    bar\n  }\n",
      name: "GraphQL request",
      locationOffset: { line: 1, column: 1 },
    },
  },
};

resetCaches();
