require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ganache");
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "rinkeby",
  networks: {
    hardhat: {
    },
    localhost: {
      url: "HTTP://127.0.0.1:7545",
    },
    rinkeby: {
      url: "https://eth-rinkeby.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY,
      accounts: [process.env.ROPSTEN_PRIVATE_KEY],
      gasPrice: 20000000000,
      gas: 6000000
    }
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 600000
  }
};
