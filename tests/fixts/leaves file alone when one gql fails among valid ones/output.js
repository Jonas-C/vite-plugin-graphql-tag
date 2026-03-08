import { gql } from "@apollo/client";

const validQuery = gql`
  query foo {
    bar
  }
`;

const invalidQuery = gql`
  query {
    baz
`;
