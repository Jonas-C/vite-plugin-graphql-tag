import { gql } from "@apollo/client";

const query = gql`
  query foo {
    bar
  }
`;

const invalidQuery = gql`
query foo {
  bar
`;
