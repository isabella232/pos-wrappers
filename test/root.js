const { expect } = require("chai");
const chai = require("chai");
const { ethers } = require("hardhat");
const { FakeContract, smock } = require("@defi-wonderland/smock");
const proof = require("./proof.json");

chai.use(smock.matchers);

describe("WithdrawToWrapperChild", function () {
  let dummyERC20,
    rootChain,
    rootChainManager,
    erc20Predicate,
    withdrawToWrapperRoot,
    accounts,
    account;

  before(async () => {
    accounts = await hre.ethers.getSigners();
    account = accounts[0].address;
    const dummyERC20Factory = await hre.ethers.getContractFactory("DummyERC20");
    const dummyERC20Contract = await dummyERC20Factory.deploy("TEST", "TEST");
    const dummyERC20 = await smock.fake(dummyERC20Contract, {
      address: "0x655f2166b0709cd575202630952d71e2bb0d61af",
      provider: accounts[0],
    }); // address of token in proof, we use fake to deploy at the right address
    dummyERC20.transfer.returns(true); // fakes return false by default, but we need fake to unlock tokens from predicate
    const rootChainFactory = await smock.mock("RootChain");
    rootChain = await rootChainFactory.deploy();
    const headerBlock = {
      729230000: {
        root: "0x4e9053f671695c9e540027d7c9dc5406e40d634841673cff743b321b79b3157e",
        start: "25982467",
        end: "25982978",
        createdAt: "1650274486",
        proposer: "0xc26880a0af2ea0c7e8130e6ec47af756465452e8",
      },
    };
    await rootChain.setVariable("headerBlocks", headerBlock); // put expected block data according to proof
    const erc20PredicateFactory = await smock.mock("ERC20Predicate");
    const erc20Predicate = await erc20PredicateFactory.deploy();
    const stateSenderFactory = await smock.mock("DummyStateSender");
    const stateSender = await stateSenderFactory.deploy();
    const rootChainManagerFactory = await smock.mock("RootChainManager");
    const rootChainManager = await rootChainManagerFactory.deploy();
    await rootChainManager.initialize(account);
    await erc20Predicate.initialize(rootChainManager.address);
    await rootChainManager.registerPredicate(
      "0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b",
      erc20Predicate.address
    ); // register our predicate with expected token type
    await rootChainManager.setStateSender(stateSender.address);
    await rootChainManager.mapToken(
      "0x655f2166b0709cd575202630952d71e2bb0d61af",
      "0xfe4f5145f6e09952a5ba9e956ed0c25e3fa4c7f1",
      "0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b"
    ); // map our fake token to our expected child token
    await rootChainManager.setCheckpointManager(rootChain.address);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xf21cdcb36b20146cd0cf7ef1629c3b084bfeea5a"],
    }); // impersonate deployer so we can deploy wrapper at the right address
    await network.provider.send("hardhat_setBalance", [
      "0xf21cdcb36b20146cd0cf7ef1629c3b084bfeea5a",
      "0xffffffffffffffff",
    ]);
    const withdrawToWrapperRootFactory = await hre.ethers.getContractFactory(
      "WithdrawToWrapperRoot"
    );
    const signer = await ethers.getSigner(
      "0xf21cdcb36b20146cd0cf7ef1629c3b084bfeea5a"
    );
    const deployTxData =
      await withdrawToWrapperRootFactory.getDeployTransaction(
        rootChain.address,
        rootChainManager.address
      );
    const deployTx = await signer.sendTransaction(deployTxData);
    await deployTx.wait();
    withdrawToWrapperRoot = await withdrawToWrapperRootFactory.attach(
      "0xb7e230f904971724c600ad5217b88d219ddd1525"
    );
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: ["0xf21cdcb36b20146cd0cf7ef1629c3b084bfeea5a"],
    });
  });
  describe("exit() self", function () {
    let receipt;
    it("Call exit()", async function () {
      const exitTokens = await withdrawToWrapperRoot.exit(
        proof.receiptProof,
        "1"
      );
      receipt = await exitTokens.wait();
    });
    it("Validate ExitedERC20", async function () {
      expect(receipt.events[0].topics[0]).to.equal(
        "0xbb61bd1b26b3684c7c028ff1a8f6dabcac2fac8ac57b66fa6b1efb6edeab03c4"
      );
      expect(receipt.events[0].topics[1]).to.equal(
        "0x000000000000000000000000b7e230f904971724c600ad5217b88d219ddd1525"
      );
      expect(receipt.events[0].topics[2]).to.equal(
        "0x000000000000000000000000655f2166b0709cd575202630952d71e2bb0d61af"
      );
      expect(receipt.events[0].data).to.equal(
        "0x00000000000000000000000000000000000000000000000000000000000f4240"
      );
    });
  });
});
