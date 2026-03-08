import { gql } from "@apollo/client";

const fragments = {
  barFragment: gql`
    fragment OptionalBarFragment on Bar {
      bar
    }
  `,
};

const query = gql`
  query foo {
    ...OptionalBarFragment
  }
  ${fragments?.barFragment}
`;
