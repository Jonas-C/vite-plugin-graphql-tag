const { gql, useQuery } = require("@apollo/client");

const query = gql`
  query foo {
    bar
  }
`;

const res = useQuery(query);
