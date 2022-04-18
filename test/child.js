const { expect } = require("chai");
const chai = require("chai");
const { ethers } = require("hardhat");
const { FakeContract, smock } = require("@defi-wonderland/smock");

chai.use(smock.matchers);

describe("WithdrawToWrapperChild", function () {
  let uChildERC20, childChainManager, withdrawToWrapperChild, accounts, account;

  before(async () => {
    accounts = await hre.ethers.getSigners();
    account = accounts[0].address;
    const uChildERC20Factory = await smock.mock("UChildERC20");
    uChildERC20 = await uChildERC20Factory.deploy();
    await uChildERC20.initialize("TEST", "TEST", 18, account);
    await uChildERC20.deposit(
      account,
      "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"
    ); // 1 ether
    const childChainManagerFactory = await smock.mock("ChildChainManager");
    childChainManager = await childChainManagerFactory.deploy();
    const childToRootToken = {};
    childToRootToken[uChildERC20.address] = uChildERC20.address;
    await childChainManager.setVariable("childToRootToken", childToRootToken);
    const withdrawToWrapperChildFactory = await hre.ethers.getContractFactory(
      "WithdrawToWrapperChild"
    );
    withdrawToWrapperChild = await withdrawToWrapperChildFactory.deploy(
      childChainManager.address
    );
    const approval = await uChildERC20.approve(
      withdrawToWrapperChild.address,
      hre.ethers.utils.parseUnits("1")
    ); // approve our contract
    await approval.wait();
  });
  describe("withdrawTo() self", function () {
    let receipt1;
    it("Call withdrawTo()", async function () {
      const withdrawTo = await withdrawToWrapperChild.withdrawTo(
        uChildERC20.address,
        hre.ethers.utils.parseUnits("0.5"),
        account
      );
      receipt1 = await withdrawTo.wait();
    });
    it("Transfer tokens to contract", async function () {
      expect(receipt1.events[0].topics[0]).to.equal(
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      );
      expect(receipt1.events[0].topics[1]).to.equal(
        "0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"
      );
      expect(receipt1.events[0].topics[2]).to.equal(
        "0x000000000000000000000000dc64a140aa3e981100a9beca4e685f962f0cf6c9"
      );
      expect(receipt1.events[0].data).to.equal(
        "0x00000000000000000000000000000000000000000000000006f05b59d3b20000"
      );
    });
    it("Withdraw tokens from contract", async function () {
      expect(receipt1.events[2].topics[0]).to.equal(
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      );
      expect(receipt1.events[2].topics[1]).to.equal(
        "0x000000000000000000000000dc64a140aa3e981100a9beca4e685f962f0cf6c9"
      );
      expect(receipt1.events[2].topics[2]).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(receipt1.events[2].data).to.equal(
        "0x00000000000000000000000000000000000000000000000006f05b59d3b20000"
      );
    });
    it("Validate MessageSent", async function () {
      expect(receipt1.events[3].topics[0]).to.equal(
        "0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036"
      );
      expect(receipt1.events[3].data).to.equal(
        "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa30000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa300000000000000000000000000000000000000000000000006f05b59d3b20000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"
      );
    });
  });
  describe("withdrawTo() other", function () {
    let receipt2;
    it("Call withdrawTo()", async function () {
      const withdrawTo = await withdrawToWrapperChild.withdrawTo(
        uChildERC20.address,
        hre.ethers.utils.parseUnits("0.5"),
        accounts[1].address
      );
      receipt2 = await withdrawTo.wait();
    });
    it("Transfer tokens to contract", async function () {
      expect(receipt2.events[0].topics[0]).to.equal(
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      );
      expect(receipt2.events[0].topics[1]).to.equal(
        "0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"
      );
      expect(receipt2.events[0].topics[2]).to.equal(
        "0x000000000000000000000000dc64a140aa3e981100a9beca4e685f962f0cf6c9"
      );
      expect(receipt2.events[0].data).to.equal(
        "0x00000000000000000000000000000000000000000000000006f05b59d3b20000"
      );
    });
    it("Withdraw tokens from contract", async function () {
      expect(receipt2.events[2].topics[0]).to.equal(
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      );
      expect(receipt2.events[2].topics[1]).to.equal(
        "0x000000000000000000000000dc64a140aa3e981100a9beca4e685f962f0cf6c9"
      );
      expect(receipt2.events[2].topics[2]).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(receipt2.events[2].data).to.equal(
        "0x00000000000000000000000000000000000000000000000006f05b59d3b20000"
      );
    });
    it("Validate MessageSent", async function () {
      expect(receipt2.events[3].topics[0]).to.equal(
        "0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036"
      );
      expect(receipt2.events[3].data).to.equal(
        "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa30000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa300000000000000000000000000000000000000000000000006f05b59d3b2000000000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"
      );
    });
  });
});
