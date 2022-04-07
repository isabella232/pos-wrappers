require("dotenv").config();
const constants = require("./constants/index.json");
const hre = require("hardhat");

async function main() {
  let childChainManager;

  const network = await hre.ethers.provider.getNetwork();

  if (network.chainId === 137) {
    // Polygon Mainnet
    childChainManager = constants.mainnet.ChildChainManagerProxy;
  } else if (network.chainId === 80001) {
    // Mumbai Testnet
    childChainManager = constants.testnet.ChildChainManagerProxy;
  } else {
    childChainManager = process.env.ChildChainManagerProxy;
  }

  const WithdrawToWrapperChild = await hre.ethers.getContractFactory("WithdrawToWrapperChild");
  const withdrawToWrapperChild = await WithdrawToWrapperChild.deploy(childChainManager);

  await withdrawToWrapperChild.deployed();

  console.log("WithdrawToWrapperChild deployed to:", withdrawToWrapperChild.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
