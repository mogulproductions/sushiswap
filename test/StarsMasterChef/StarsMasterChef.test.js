const ethers = require("hardhat").ethers;
const expect = require("chai").expect;
const advanceBlockTo = require("../utilities").advanceBlockTo;
const advanceBlock = require("../utilities").advanceBlock;

describe("StarsMasterChef", async () => {
  let stars, starsMasterChef;
  let starsMasterChefAsSigner1, starsMasterChefAsSigner2;
  let starsAsSigner1, starsAsSigner2;

  beforeEach(async function () {
    signers = await ethers.getSigners();

    const StarsMasterChef = await ethers.getContractFactory("StarsMasterChef");
    const Stars = await ethers.getContractFactory("DummyStars");

    stars = await Stars.deploy(
      [signers[0].address, signers[1].address, signers[2].address],
      [
        ethers.utils.parseEther("40000100"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100"),
      ]
    );
    await stars.deployed();

    starsMasterChef = await StarsMasterChef.deploy(
      stars.address,
      stars.address,
      0,
      signers[0].address
    );
    await starsMasterChef.deployed();

    const provider = stars.provider;
    const signer1 = provider.getSigner(signers[1].address);
    const signer2 = provider.getSigner(signers[2].address);
    starsAsSigner1 = stars.connect(signer1);
    starsAsSigner2 = stars.connect(signer2);
    starsMasterChefAsSigner1 = starsMasterChef.connect(signer1);
    starsMasterChefAsSigner2 = starsMasterChef.connect(signer2);

    await (
      await stars.transfer(
        starsMasterChef.address,
        ethers.utils.parseEther("40000000")
      )
    ).wait();
  });

  it("is initialized properly", async () => {
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("100")
    );
  });

  it("should distribute Stars properly for each staker", async () => {
    await (
      await stars.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (await starsMasterChef.deposit(ethers.utils.parseEther("10"))).wait();
    expect(await starsMasterChef.poolSupply()).to.equal(
      ethers.utils.parseEther("10")
    );

    await (await starsMasterChef.updatePool()).wait();
    expect(await starsMasterChef.accStarsPerShare()).to.equal("20000000000000"); //20 * 1e12

    await (await starsMasterChef.updatePool()).wait();
    expect(await starsMasterChef.accStarsPerShare()).to.equal("40000000000000"); //40 * 1e12

    await (await starsMasterChef.collectRewards()).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("690")
    );
    await (await starsMasterChef.collectRewards()).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("890")
    );

    await (
      await starsAsSigner1.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (
      await starsMasterChefAsSigner1.deposit(ethers.utils.parseEther("10"))
    ).wait();
    expect(await starsMasterChef.poolSupply()).to.equal(
      ethers.utils.parseEther("20")
    );
    await (await starsMasterChef.updatePool()).wait();
    expect(await starsMasterChef.accStarsPerShare()).to.equal(
      "130000000000000"
    );
    await (await starsMasterChef.collectRewards()).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("1490")
    );

    await (await starsMasterChef.deposit(ethers.utils.parseEther("20"))).wait();
    await (await starsMasterChef.updatePool()).wait();
    expect(await starsMasterChef.accStarsPerShare()).to.equal(
      "155000000000000"
    );
    await (await starsMasterChef.collectRewards()).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("1870")
    );

    await (await starsMasterChef.withdraw(ethers.utils.parseEther("10"))).wait();
    expect(await starsMasterChef.poolSupply()).to.equal(
      ethers.utils.parseEther("30")
    );
    expect(await starsMasterChef.accStarsPerShare()).to.equal(
      "165000000000000"
    );
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("2030")
    );
    await (await starsMasterChef.collectRewards()).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("2163.33333333334")
    );
  });

  it("deposits work correctly", async () => {
    await (
      await stars.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (await starsMasterChef.deposit(ethers.utils.parseEther("10"))).wait();
    expect(await starsMasterChef.poolSupply()).to.equal(
      ethers.utils.parseEther("10")
    );
    expect(
      (await starsMasterChef.userInfo(signers[0].address)).amount
    ).to.equal(ethers.utils.parseEther("10"));
  });

  it("withdrawals work correctly", async () => {
    await (
      await stars.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (await starsMasterChef.deposit(ethers.utils.parseEther("10"))).wait();

    await (await starsMasterChef.withdraw(ethers.utils.parseEther("5"))).wait();
    expect(await starsMasterChef.poolSupply()).to.equal(
      ethers.utils.parseEther("5")
    );
    expect(
      (await starsMasterChef.userInfo(signers[0].address)).amount
    ).to.equal(ethers.utils.parseEther("5"));

    await (await starsMasterChef.withdraw(ethers.utils.parseEther("5"))).wait();
    expect(await starsMasterChef.poolSupply()).to.equal(
      ethers.utils.parseEther("0")
    );
    expect(
      (await starsMasterChef.userInfo(signers[0].address)).amount
    ).to.equal(ethers.utils.parseEther("0"));
  });

  it("calculates pending rewards correctly", async () => {
    await (
      await stars.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (await starsMasterChef.deposit(ethers.utils.parseEther("10"))).wait();
    await advanceBlock();
    expect(await starsMasterChef.pendingStars(signers[0].address)).to.equal(ethers.utils.parseEther("200"));
  });

  it("withdraws remaining Stars correctly", async () => {
    try {
      await (
        await starsMasterChefAsSigner1.withdrawRemainingStars(
          signers[0].address
        )
      ).wait();
      expect(false).to.be.true;
    } catch (error) {
      expect(error.message).to.match(/Sender is not admin/);
    }

    await (
      await starsMasterChef.withdrawRemainingStars(signers[0].address)
    ).wait();
    expect(await stars.balanceOf(starsMasterChef.address)).to.equal(
      ethers.utils.parseEther("0")
    );
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("40000100")
    );
  });
});
