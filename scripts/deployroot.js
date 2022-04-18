require("dotenv").config();
const constants = require("./constants/index.json");
const hre = require("hardhat");

async function main() {
  let rootChain, rootChainManager;

  const network = await hre.ethers.provider.getNetwork();

  if (network.chainId === 1) {
    // Ethereum Mainnet
    rootChain = constants.mainnet.RootChainProxy;
    rootChainManager = constants.mainnet.RootChainManagerProxy;
  } else if (network.chainId === 5) {
    // Goerli Testnet
    rootChain = constants.testnet.RootChainProxy;
    rootChainManager = constants.testnet.RootChainManagerProxy;
  } else {
    rootChain = process.env.RootChainProxy;
    rootChainManager = process.env.RootChainManagerProxy;
  }

  const WithdrawToWrapperRoot = await hre.ethers.getContractFactory(
    "WithdrawToWrapperRoot"
  );
  const withdrawToWrapperRoot = await WithdrawToWrapperRoot.deploy(
    rootChain,
    rootChainManager
  );

  await withdrawToWrapperRoot.deployed();

  console.log(
    "WithdrawToWrapperRoot deployed to:",
    withdrawToWrapperRoot.address
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
