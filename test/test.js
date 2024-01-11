const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Wallet Contract Test", function () {

  let deployerAccount, investorAddr1, investorAddr2, investorAddr3, designWalletAddr;
  let testToken;
  let wallet;
  let nullAddress = "0x0000000000000000000000000000000000000000";
  let investorAddrBal = [0, 0, 0];
  let released = 0;
  let releasing = 0;
  let addrShares = [1000, 500, 2000];
  let addrFees = [5, 10, 0];
  let addrReleasing = [0, 0, 0];
  let feesReleasing = 0;
  let addrClaimed = [0, 0, 0];
  let feesClaimed = 0;
  let claimed = 0;

  before(async function () {
    [deployerAccount, investorAddr1, investorAddr2, investorAddr3, designWalletAddr] = await ethers.getSigners();

    // Deploy Test Token Contract
    const TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy();
    await testToken.deployed();
    
    // Deploy Wallet Contract
    const Wallet = await ethers.getContractFactory("DesignWallet");
    wallet = await Wallet.deploy("Test Investment", nullAddress);
    await wallet.deployed();

    // Get Investors Wallet Token Balances
    investorAddrBal[0] = await testToken.balanceOf(investorAddr1.address);
    investorAddrBal[1] = await testToken.balanceOf(investorAddr2.address);
    investorAddrBal[2] = await testToken.balanceOf(investorAddr3.address);
  });

  describe("Verify Deployed Contract", function () {
    it("Investment Name 'Test Investment'", async function () {
      expect(await wallet._investment()).to.equal("Test Investment");
    });

    it("Token Address", async function () {
      expect(await wallet._tokenAddress()).to.equal(nullAddress);
    });

    it("0xDesign Wallet Address", async function () {
      expect(await wallet._0xDesignAddress()).to.equal(deployerAccount.address);
    });
  });

  describe("Transactions", function () {
    it("Change Token Address", async function () {
      const tokenAddressChange = await wallet.changeTokenAddress(testToken.address);
      await tokenAddressChange.wait();

      expect(await wallet._tokenAddress()).to.equal(testToken.address);
    });
  
    it("Change 0xDesign Wallet Address", async function () {
      const feesWalletChange = await wallet.setFeesWallet(designWalletAddr.address);
      await feesWalletChange.wait();

      expect(await wallet._0xDesignAddress()).to.equal(designWalletAddr.address);
    });
  
    it("Add Two Payees", async function () {
      const addPayees = await wallet._addPayees([investorAddr1.address, investorAddr2.address], [addrShares[0], addrShares[1]], [addrFees[0], addrFees[1]]);
      await addPayees.wait();

      expect(await wallet.payee(0)).to.equal(investorAddr1.address);
      expect(await wallet.shares(investorAddr1.address)).to.equal("1000");
      expect(await wallet.claimed(investorAddr1.address)).to.equal("0");
      expect(await wallet.payee(1)).to.equal(investorAddr2.address);
      expect(await wallet.shares(investorAddr2.address)).to.equal("500");
      expect(await wallet.claimed(investorAddr2.address)).to.equal("0");
      expect(await wallet.totalShares()).to.equal("1500");
      expect(await wallet.totalClaimed()).to.equal("0");
    });

    it("Add One Payee", async function () {
      const addPayee = await wallet._addPayee(investorAddr3.address, addrShares[2], addrFees[2]);
      await addPayee.wait();

      expect(await wallet.payee(2)).to.equal(investorAddr3.address);
      expect(await wallet.shares(investorAddr3.address)).to.equal("2000");
      expect(await wallet.claimed(investorAddr3.address)).to.equal("0");
      expect(await wallet.totalShares()).to.equal("3500");
      expect(await wallet.totalClaimed()).to.equal("0");
    });
  
    describe("Release Batch 1 Tokens to Investors", function () {
      it("Transfer Batch 1 Tokens", async function () {
        let contractTokenBal = await testToken.balanceOf(wallet.address);
        const tokenContractTransfer = await testToken.transfer(wallet.address, ethers.utils.parseUnits('350', 18));
        await tokenContractTransfer.wait();
        expect(await testToken.balanceOf(wallet.address)).to.equal(contractTokenBal.add(ethers.utils.parseUnits('350', 18)));
      });
  
      it("Release Batch 1 Tokens", async function () {
        releasing = 10;
        released += releasing;
        const releaseBatch = await wallet.releaseBatch(releasing);
        await releaseBatch.wait();
      });

      it("Investor 1 Claiming Token", async function () {
        addrReleasing[0] = (addrShares[0] * (100 - addrFees[0]) / 100 * released / 100) - addrClaimed[0];
        const releaseTokens = await wallet.connect(investorAddr1).release();
        await releaseTokens.wait();
        
        addrClaimed[0] += addrReleasing[0];
        claimed += addrReleasing[0];
        expect(await testToken.balanceOf(investorAddr1.address)).to.equal(investorAddrBal[0].add(ethers.utils.parseUnits(addrReleasing[0].toString(), 18)));
        expect(await wallet.totalClaimed()).to.equal(claimed);
        investorAddrBal[0] = await testToken.balanceOf(investorAddr1.address);
        feesReleasing += addrReleasing[0] * addrFees[0] / (100 - addrFees[0]);

        addrReleasing[0] = 0;
      });
  
      it("Owner Claim Fees Token", async function () {
        const releaseFees = await wallet.releaseFees();
        await releaseFees.wait();
  
        feesClaimed += feesReleasing;
        claimed += feesReleasing;
        expect(await testToken.balanceOf(designWalletAddr.address)).to.equal(ethers.utils.parseUnits(feesClaimed.toString(), 18));
        expect(await wallet.totalClaimed()).to.equal(claimed);
        feesReleasing = 0;
      });
    });

    describe("Release Batch 2 Tokens to Investors", function () {
      it("Transfer Batch 2 Tokens", async function () {
        let contractTokenBal = await testToken.balanceOf(wallet.address);
        const tokenContractTransfer = await testToken.transfer(wallet.address, ethers.utils.parseUnits('700', 18));
        await tokenContractTransfer.wait();
        expect(await testToken.balanceOf(wallet.address)).to.equal(contractTokenBal.add(ethers.utils.parseUnits('700', 18)));
      });
  
      it("Release Batch 2 Tokens", async function () {
        releasing = 20;
        released += releasing;
        const releaseBatch = await wallet.releaseBatch(releasing);
        await releaseBatch.wait();
      });

      it("Investor 2 Claiming Token", async function () {
        addrReleasing[1] = (addrShares[1] * (100 - addrFees[1]) / 100 * released / 100) - addrClaimed[1];
        const releaseTokens = await wallet.connect(investorAddr2).release();
        await releaseTokens.wait();
  
        addrClaimed[1] += addrReleasing[1];
        claimed += addrReleasing[1];
        expect(await testToken.balanceOf(investorAddr2.address)).to.equal(investorAddrBal[1].add(ethers.utils.parseUnits(addrReleasing[1].toString(), 18)));
        expect(await wallet.totalClaimed()).to.equal(claimed);
        investorAddrBal[1] = await testToken.balanceOf(investorAddr2.address);
        feesReleasing += addrReleasing[1] * addrFees[1] / (100 - addrFees[1]);
        addrReleasing[1] = 0;
      });
    });

    describe("Release Batch 3 Tokens to Investors", function () {
      it("Transfer Batch 3 Tokens", async function () {
        let contractTokenBal = await testToken.balanceOf(wallet.address);
        const tokenContractTransfer = await testToken.transfer(wallet.address, ethers.utils.parseUnits('1050', 18));
        await tokenContractTransfer.wait();
        expect(await testToken.balanceOf(wallet.address)).to.equal(contractTokenBal.add(ethers.utils.parseUnits('1050', 18)));
      });
  
      it("Release Batch 3 Tokens", async function () {
        releasing = 30;
        released += releasing;
        const releaseBatch = await wallet.releaseBatch(releasing);
        await releaseBatch.wait();
      });

      it("Investor 1 Claiming Token", async function () {
        addrReleasing[0] = (addrShares[0] * (100 - addrFees[0]) / 100 * released / 100) - addrClaimed[0];
        const releaseTokens = await wallet.connect(investorAddr1).release();
        await releaseTokens.wait();
  
        addrClaimed[0] += addrReleasing[0];
        claimed += addrReleasing[0];
        expect(await testToken.balanceOf(investorAddr1.address)).to.equal(investorAddrBal[0].add(ethers.utils.parseUnits(addrReleasing[0].toString(), 18)));
        expect(await wallet.totalClaimed()).to.equal(claimed);
        investorAddrBal[0] = await testToken.balanceOf(investorAddr1.address);
        feesReleasing += addrReleasing[0] * addrFees[0] / (100 - addrFees[0]);
        addrReleasing[0] = 0;
      });

      it("Investor 2 Claiming Token", async function () {
        addrReleasing[1] = (addrShares[1] * (100 - addrFees[1]) / 100 * released / 100) - addrClaimed[1];
        const releaseTokens = await wallet.connect(investorAddr2).release();
        await releaseTokens.wait();
  
        addrClaimed[1] += addrReleasing[1];
        claimed += addrReleasing[1];
        expect(await testToken.balanceOf(investorAddr2.address)).to.equal(investorAddrBal[1].add(ethers.utils.parseUnits(addrReleasing[1].toString(), 18)));
        expect(await wallet.totalClaimed()).to.equal(claimed);
        investorAddrBal[1] = await testToken.balanceOf(investorAddr2.address);
        feesReleasing += addrReleasing[1] * addrFees[1] / (100 - addrFees[1]);
        addrReleasing[1] = 0;
      });

      it("Investor 3 Claiming Token", async function () {
        addrReleasing[2] = (addrShares[2] * (100 - addrFees[2]) / 100 * released / 100) - addrClaimed[2];
        const releaseTokens = await wallet.connect(investorAddr3).release();
        await releaseTokens.wait();
  
        addrClaimed[2] += addrReleasing[2];
        claimed += addrReleasing[2];
        expect(await testToken.balanceOf(investorAddr3.address)).to.equal(investorAddrBal[2].add(ethers.utils.parseUnits(addrReleasing[2].toString(), 18)));
        expect(await wallet.totalClaimed()).to.equal(claimed);
        investorAddrBal[2] = await testToken.balanceOf(investorAddr3.address);
        feesReleasing += addrReleasing[2] * addrFees[2] / (100 - addrFees[2]);
        addrReleasing[2] = 0;
      });
  
      it("Owner Claim Fees Token", async function () {
        const releaseFees = await wallet.releaseFees();
        await releaseFees.wait();
  
        feesClaimed += feesReleasing;
        claimed += feesReleasing;
        expect(await testToken.balanceOf(designWalletAddr.address)).to.equal(ethers.utils.parseUnits(feesClaimed.toString(), 18));
        expect(await wallet.totalClaimed()).to.equal(claimed);
        feesReleasing = 0;
      });
    });
  });
});
