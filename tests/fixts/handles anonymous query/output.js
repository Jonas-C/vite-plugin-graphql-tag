const query = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
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
    end: 17,
    source: {
      body: "\n  {\n    bar\n  }\n",
      name: "GraphQL request",
      locationOffset: { line: 1, column: 1 },
    },
  },
};
