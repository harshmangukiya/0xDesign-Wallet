const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Wallet Contract Test", function () {

  let testToken;
  let wallet;
  let addr1 = "0x56aAa95453fcb6Cdeb67aEF3B1dAEd00FaDC7a6c";
  let addr2 = "0xAE688de39e10410B306B7533F0e6007aa7FE6A32"; //Deployer & Owner Address
  let addr3 = "0xB5D22011C8e2fE19B27A7F5CAd539d6e7f479Fdf";
  let nullAddress = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    const TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy();
    await testToken.deployed();    

    const Wallet = await ethers.getContractFactory("DesignWallet");
    wallet = await Wallet.deploy("Test", testToken.address);
    await wallet.deployed();

    const setFeesWallet = await wallet.setFeesWallet(addr1.toString());
    await setFeesWallet.wait();
  });

  describe("Deployment", function () {
    it("Verify Deployed Contract Investment and Token Address", async function () {
      expect(await wallet._investment()).to.equal("Test");
      expect(await wallet._tokenAddress()).to.equal(testToken.address);
      expect(await wallet._0xDesignAddress()).to.equal(addr1.toString());
    });
  });

  describe("Transactions", function () {
    it("Change Token Address", async function () {
      const tokenAddressChange = await wallet.changeTokenAddress(nullAddress);
      await tokenAddressChange.wait();

      expect(await wallet._tokenAddress()).to.equal(nullAddress);
    });
  
    it("Change 0xDesign Wallet Address", async function () {
      const feesWalletChange = await wallet.setFeesWallet(addr1.toString());
      await feesWalletChange.wait();

      expect(await wallet._0xDesignAddress()).to.equal(addr1.toString());
    });
  
    it("Set Payees", async function () {
      const addPayees = await wallet._addPayees([addr1.toString(), addr2.toString()], [1000, 500], [5, 10]);
      await addPayees.wait();

      expect(await wallet.payee(0)).to.equal(addr1.toString());
      expect(await wallet.shares(addr1.toString())).to.equal("1000");
      expect(await wallet.claimed(addr1.toString())).to.equal("0");
      expect(await wallet.payee(1)).to.equal(addr2.toString());
      expect(await wallet.shares(addr2.toString())).to.equal("500");
      expect(await wallet.claimed(addr2.toString())).to.equal("0");
      expect(await wallet.totalShares()).to.equal("1500");
      expect(await wallet.totalClaimed()).to.equal("0");
  
      const addPayee = await wallet._addPayee(addr3.toString(), 2000, 0);
      await addPayee.wait();

      expect(await wallet.payee(2)).to.equal(addr3.toString());
      expect(await wallet.shares(addr3.toString())).to.equal("2000");
      expect(await wallet.claimed(addr3.toString())).to.equal("0");
      expect(await wallet.totalShares()).to.equal("3500");
      expect(await wallet.totalClaimed()).to.equal("0");
    });
  
    it("Transfer Tokens to Contract", async function () {
      const tokenContractTransfer = await testToken.transfer(wallet.address, ethers.utils.parseUnits('350', 18));
      await tokenContractTransfer.wait();
      expect(await testToken.balanceOf(wallet.address)).to.equal(ethers.utils.parseUnits('350', 18));
    });

    it("Release Batch 1", async function () {
      const addPayees = await wallet._addPayees([addr1.toString(), addr2.toString(), addr3.toString()], [1000, 500, 2000], [5, 10, 0]);
      await addPayees.wait();

      const tokenContractTransfer = await testToken.transfer(wallet.address, ethers.utils.parseUnits('350', 18));
      await tokenContractTransfer.wait();

      let ownerBal = await testToken.balanceOf(addr2.toString());
      let released = 0;
      let releasing = 0;
      let addrShares = 500;
      let addrFees = 10;
      let addrReleasing = 0;
      let feesReleasing = 0;
      let addrClaimed = 0;
      let feesClaimed = 0;
      let claimed = 0;

      //First Batch Release with Fees Claim

      releasing = 10;
      released += releasing;
      const releaseBatch = await wallet.releaseBatch(releasing);
      await releaseBatch.wait();

      addrReleasing = addrShares * (100 - addrFees) / 100 * releasing / 100;
      const releaseTokens = await wallet.release();
      await releaseTokens.wait();

      addrClaimed += addrReleasing;
      claimed += addrReleasing;
      expect(await testToken.balanceOf(addr2.toString())).to.equal(ownerBal.add(ethers.utils.parseUnits(addrReleasing.toString(), 18)));
      expect(await wallet.totalClaimed()).to.equal(claimed);
      ownerBal = await testToken.balanceOf(addr2.toString());
      addrReleasing = 0;

      const releaseFees = await wallet.releaseFees();
      await releaseFees.wait();

      feesReleasing = addrShares * addrFees / 100 * releasing / 100;
      feesClaimed += feesReleasing;
      claimed += feesReleasing;
      expect(await testToken.balanceOf(addr1.toString())).to.equal(ethers.utils.parseUnits(feesClaimed.toString(), 18));
      expect(await wallet.totalClaimed()).to.equal(claimed);
      ownerBal = await testToken.balanceOf(addr2.toString());
      feesReleasing = 0;

      //Second Batch Release without Fees Claim

      releasing = 20;
      released += releasing;
      const releaseBatch2 = await wallet.releaseBatch(releasing);
      await releaseBatch2.wait();

      addrReleasing = addrShares * (100 - addrFees) / 100 * releasing / 100;
      const releaseTokens2 = await wallet.release();
      await releaseTokens2.wait();

      addrClaimed += addrReleasing;
      claimed += addrReleasing;
      expect(await testToken.balanceOf(addr2.toString())).to.equal(ownerBal.add(ethers.utils.parseUnits(addrReleasing.toString(), 18)));
      expect(await wallet.totalClaimed()).to.equal(claimed);
      ownerBal = await testToken.balanceOf(addr2.toString());
      addrReleasing = 0;
      feesReleasing += addrShares * addrFees / 100 * releasing / 100;

      //Third Batch Release with Fees Claim

      releasing = 30;
      released += releasing;
      const releaseBatch3 = await wallet.releaseBatch(releasing);
      await releaseBatch3.wait();

      addrReleasing = addrShares * (100 - addrFees) / 100 * releasing / 100;
      const releaseTokens3 = await wallet.release();
      await releaseTokens3.wait();

      addrClaimed += addrReleasing;
      claimed += addrReleasing;
      expect(await testToken.balanceOf(addr2.toString())).to.equal(ownerBal.add(ethers.utils.parseUnits(addrReleasing.toString(), 18)));
      expect(await wallet.totalClaimed()).to.equal(claimed);
      ownerBal = await testToken.balanceOf(addr2.toString());
      addrReleasing = 0;
      
      const releaseFees3 = await wallet.releaseFees();
      await releaseFees3.wait();

      feesReleasing += addrShares * addrFees / 100 * releasing / 100;
      feesClaimed += feesReleasing;
      claimed += feesReleasing;
      expect(await testToken.balanceOf(addr1.toString())).to.equal(ethers.utils.parseUnits(feesClaimed.toString(), 18));
      expect(await wallet.totalClaimed()).to.equal(claimed);
      ownerBal = await testToken.balanceOf(addr2.toString());feesReleasing = 0;
    });
  });
});
