import { gql, useQuery } from "@apollo/client";

const query = gql`
  query foo {
    bar
  }
`;

const res = useQuery(query);
