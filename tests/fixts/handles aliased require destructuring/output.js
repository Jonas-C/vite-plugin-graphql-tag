const { gql: myGql } = require("@apollo/client");

const query = myGql`
  query foo {
    bar
  }
`;
