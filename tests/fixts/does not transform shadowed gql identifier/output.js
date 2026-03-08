function makeQuery(gql) {
  return gql`
    query fromArg {
      bar
    }
  `;
}

const query = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "root" },
      variableDefinitions: [],
      directives: [],
      selectionSet: {
        kind: "SelectionSet",
        selections: [{ kind: "Field", name: { kind: "Name", value: "baz" }, arguments: [], directives: [] }],
      },
    },
  ],
  loc: {
    start: 0,
    end: 28,
    source: {
      body: "\n  query root {\n    baz\n  }\n",
      name: "GraphQL request",
      locationOffset: { line: 1, column: 1 },
    },
  },
};

export { makeQuery, query };
