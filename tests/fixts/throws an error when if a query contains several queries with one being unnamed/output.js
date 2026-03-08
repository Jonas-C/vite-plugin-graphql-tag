import { gql } from "@apollo/client";

const query = gql`
  query user {
    bar
  }
  query {
    baz
  }
`;
