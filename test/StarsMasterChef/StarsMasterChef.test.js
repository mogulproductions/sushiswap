const ethers = require("hardhat").ethers;
const expect = require("chai").expect;
const advanceBlockTo = require("../utilities").advanceBlockTo;
const advanceBlock = require("../utilities").advanceBlock;

describe("StarsMasterChef", async () => {
  let stars, starsMasterChef;
  let token1, token2;

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
    token1 = await Stars.deploy(
      [signers[0].address, signers[1].address, signers[2].address],
      [
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100"),
      ]
    );
    await token1.deployed();
    token2 = await Stars.deploy(
      [signers[0].address, signers[1].address, signers[2].address],
      [
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100"),
      ]
    );
    await token2.deployed();

    starsMasterChef = await StarsMasterChef.deploy(
      stars.address,
      signers[0].address,
      [
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("70"),
        ethers.utils.parseEther("20"),
      ],
      [100000, 300000, 600000]
    );
    await starsMasterChef.deployed();

    await (
      await stars.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("40000100")
      )
    ).wait();

    await (await starsMasterChef.init(1)).wait();

    await (await starsMasterChef.add(100, token1.address, false)).wait();
  });

  it("is initialized properly", async () => {
    try {
      await (await starsMasterChef.init(0)).wait();
      expect(false).to.be.true;
    } catch (error) {
      expect(error.message).to.match(/Already initialized/);
    }
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("100")
    );
    expect(await starsMasterChef.startBlock()).to.equal(1);

    const pool0 = await starsMasterChef.poolInfo(0);
    expect(pool0.lastRewardBlock).to.equal(7);
    expect(pool0.allocPoint).to.equal(100);
    expect(pool0.accStarsPerShare).to.equal(0);
    expect(pool0.poolSupply).to.equal(0);
    expect(pool0.lpToken).to.equal(token1.address);

    expect(await starsMasterChef.totalAllocPoint()).to.equal(100);

    expect(await starsMasterChef.totalStarsPerEpoch(0)).to.equal(
      ethers.utils.parseEther("20000000")
    );
    expect(await starsMasterChef.totalStarsPerEpoch(1)).to.equal(
      ethers.utils.parseEther("14000000")
    );
    expect(await starsMasterChef.totalStarsPerEpoch(2)).to.equal(
      ethers.utils.parseEther("6000000")
    );
  });

  it("should distribute Stars properly with one pool", async () => {
    await (
      await token1.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (
      await starsMasterChef.deposit(0, ethers.utils.parseEther("10"))
    ).wait();
    expect((await starsMasterChef.poolInfo(0)).poolSupply).to.equal(
      ethers.utils.parseEther("10")
    );

    await (await starsMasterChef.updatePool(0)).wait();
    expect((await starsMasterChef.poolInfo(0)).accStarsPerShare).to.equal(
      "20000000000000"
    ); //20 * 1e12

    await (await starsMasterChef.updatePool(0)).wait();
    expect((await starsMasterChef.poolInfo(0)).accStarsPerShare).to.equal(
      "40000000000000"
    ); //40 * 1e12

    await (await starsMasterChef.collectRewards(0)).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("700")
    );
    await (await starsMasterChef.collectRewards(0)).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("900")
    );

    await (
      await token1
        .connect(signers[1])
        .approve(starsMasterChef.address, ethers.utils.parseEther("100"))
    ).wait();
    await (
      await starsMasterChef
        .connect(signers[1])
        .deposit(0, ethers.utils.parseEther("10"))
    ).wait();
    expect((await starsMasterChef.poolInfo(0)).poolSupply).to.equal(
      ethers.utils.parseEther("20")
    );
    await (await starsMasterChef.updatePool(0)).wait();
    expect((await starsMasterChef.poolInfo(0)).accStarsPerShare).to.equal(
      "130000000000000"
    );
    await (await starsMasterChef.collectRewards(0)).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("1500")
    );

    await (
      await starsMasterChef.deposit(0, ethers.utils.parseEther("20"))
    ).wait();
    await (await starsMasterChef.updatePool(0)).wait();
    expect((await starsMasterChef.poolInfo(0)).accStarsPerShare).to.equal(
      "155000000000000"
    );
    await (await starsMasterChef.collectRewards(0)).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("1900")
    );

    await (
      await starsMasterChef.withdraw(0, ethers.utils.parseEther("10"))
    ).wait();
    expect((await starsMasterChef.poolInfo(0)).accStarsPerShare).to.equal(
      "165000000000000"
    );
    await (await starsMasterChef.collectRewards(0)).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("2183.33333333334")
    );

    await (await starsMasterChef.connect(signers[1]).collectRewards(0)).wait();
    expect(await stars.balanceOf(signers[1].address)).to.equal(
      ethers.utils.parseEther("683.33333333334")
    );
  });

  it("should distribute Stars properly with multiple pools", async () => {
    await (await starsMasterChef.add(300, token2.address, false)).wait();
    await (
      await token1.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (
      await token2.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (
      await starsMasterChef.deposit(0, ethers.utils.parseEther("10"))
    ).wait();
    await (
      await starsMasterChef.deposit(1, ethers.utils.parseEther("10"))
    ).wait();
    expect(await starsMasterChef.pendingStars(0, signers[0].address)).to.equal(
      ethers.utils.parseEther("50")
    );
    await (await starsMasterChef.massUpdatePools()).wait();
    expect((await starsMasterChef.poolInfo(0)).accStarsPerShare).to.equal(
      "10000000000000"
    );
    expect((await starsMasterChef.poolInfo(1)).accStarsPerShare).to.equal(
      "15000000000000"
    );
    await (await starsMasterChef.massUpdatePools()).wait();
    expect((await starsMasterChef.poolInfo(0)).accStarsPerShare).to.equal(
      "15000000000000"
    );
    expect((await starsMasterChef.poolInfo(1)).accStarsPerShare).to.equal(
      "30000000000000"
    );

    await (await starsMasterChef.collectRewards(0)).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("300")
    );
    await (await starsMasterChef.collectRewards(1)).wait();
    expect(await stars.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("900")
    );
  });

  it("should distribute Stars properly in all 3 epochs", async () => {
    const StarsMasterChef = await ethers.getContractFactory("StarsMasterChef");
    const Stars = await ethers.getContractFactory("DummyStars");

    starsCopy = await Stars.deploy(
      [signers[0].address, signers[1].address, signers[2].address],
      [
        ethers.utils.parseEther("40100"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100"),
      ]
    );
    await starsCopy.deployed();

    //Same contract, but with different epochs
    starsMasterChefCopy = await StarsMasterChef.deploy(
      starsCopy.address,
      signers[0].address,
      [
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("70"),
        ethers.utils.parseEther("20"),
      ],
      [100, 300, 600]
    );
    await starsMasterChefCopy.deployed();

    await (
      await starsCopy.approve(
        starsMasterChefCopy.address,
        ethers.utils.parseEther("40100")
      )
    ).wait();

    await (await starsMasterChefCopy.init(0)).wait();
    await (await starsMasterChefCopy.add(100, token1.address, false)).wait();

    expect(await starsCopy.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("100")
    );
    expect(await starsCopy.balanceOf(starsMasterChefCopy.address)).to.equal(
      ethers.utils.parseEther("40000")
    );

    await (
      await token1.approve(
        starsMasterChefCopy.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (
      await token1
        .connect(signers[1])
        .approve(starsMasterChefCopy.address, ethers.utils.parseEther("100"))
    ).wait();

    await (
      await starsMasterChefCopy.deposit(0, ethers.utils.parseEther("10"))
    ).wait();
    await (
      await starsMasterChefCopy
        .connect(signers[1])
        .deposit(0, ethers.utils.parseEther("30"))
    ).wait();

    expect(await starsMasterChefCopy.provider.getBlockNumber()).to.equal(63);
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[0].address)
    ).to.equal(ethers.utils.parseEther("200"));
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[1].address)
    ).to.equal(ethers.utils.parseEther("0"));
    await advanceBlockTo(100);
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[0].address)
    ).to.equal(ethers.utils.parseEther("2050"));
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[1].address)
    ).to.equal(ethers.utils.parseEther("5550"));
    await advanceBlockTo(150);
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[0].address)
    ).to.equal(ethers.utils.parseEther("2925"));
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[1].address)
    ).to.equal(ethers.utils.parseEther("8175"));
    await advanceBlockTo(300);
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[0].address)
    ).to.equal(ethers.utils.parseEther("5550"));
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[1].address)
    ).to.equal(ethers.utils.parseEther("16050"));
    await advanceBlockTo(400);
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[0].address)
    ).to.equal(ethers.utils.parseEther("6050"));
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[1].address)
    ).to.equal(ethers.utils.parseEther("17550"));
    await advanceBlockTo(700);
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[0].address)
    ).to.equal(ethers.utils.parseEther("7050"));
    expect(
      await starsMasterChefCopy.pendingStars(0, signers[1].address)
    ).to.equal(ethers.utils.parseEther("20550"));

    await (
      await starsMasterChefCopy.withdraw(0, ethers.utils.parseEther("10"))
    ).wait();
    await (
      await starsMasterChefCopy
        .connect(signers[1])
        .withdraw(0, ethers.utils.parseEther("30"))
    ).wait();

    expect(await starsCopy.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("7150")
    );
    expect(await starsCopy.balanceOf(signers[1].address)).to.equal(
      ethers.utils.parseEther("20650")
    );

    expect(await starsCopy.balanceOf(starsMasterChefCopy.address)).to.equal(
      ethers.utils.parseEther("12400")
    );
  });

  it("deposits work correctly", async () => {
    await (
      await token1.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (
      await starsMasterChef.deposit(0, ethers.utils.parseEther("10"))
    ).wait();
    expect((await starsMasterChef.poolInfo(0)).poolSupply).to.equal(
      ethers.utils.parseEther("10")
    );
    expect(
      (await starsMasterChef.userInfo(0, signers[0].address)).amount
    ).to.equal(ethers.utils.parseEther("10"));
  });

  it("withdrawals work correctly", async () => {
    await (
      await token1.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (
      await starsMasterChef.deposit(0, ethers.utils.parseEther("10"))
    ).wait();

    await (
      await starsMasterChef.withdraw(0, ethers.utils.parseEther("5"))
    ).wait();
    expect((await starsMasterChef.poolInfo(0)).poolSupply).to.equal(
      ethers.utils.parseEther("5")
    );
    expect(
      (await starsMasterChef.userInfo(0, signers[0].address)).amount
    ).to.equal(ethers.utils.parseEther("5"));

    await (
      await starsMasterChef.withdraw(0, ethers.utils.parseEther("5"))
    ).wait();
    expect((await starsMasterChef.poolInfo(0)).poolSupply).to.equal(
      ethers.utils.parseEther("0")
    );
    expect(
      (await starsMasterChef.userInfo(0, signers[0].address)).amount
    ).to.equal(ethers.utils.parseEther("0"));
  });

  it("calculates pending rewards correctly", async () => {
    await (
      await token1.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (
      await starsMasterChef.deposit(0, ethers.utils.parseEther("10"))
    ).wait();
    await advanceBlock();
    expect(await starsMasterChef.pendingStars(0, signers[0].address)).to.equal(
      ethers.utils.parseEther("200")
    );
  });

  it("processes emergency withdrawals", async () => {
    await (
      await token1.approve(
        starsMasterChef.address,
        ethers.utils.parseEther("100")
      )
    ).wait();
    await (
      await starsMasterChef.deposit(0, ethers.utils.parseEther("100"))
    ).wait();
    expect(await token1.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("0")
    );
    await await starsMasterChef.emergencyWithdraw(0);
    expect((await starsMasterChef.poolInfo(0)).poolSupply).to.equal(
      ethers.utils.parseEther("0")
    );
    expect(await token1.balanceOf(signers[0].address)).to.equal(
      ethers.utils.parseEther("100")
    );

    const user = await starsMasterChef.userInfo(0, signers[0].address);
    expect(user.amount).to.equal(0);
    expect(user.rewardDebt).to.equal(0);
  });

  it("should calculates the accumulated Stars per share correctly for later periods", async () => {
    expect(
      await starsMasterChef.accStarsPerShareAtCurrRate(150000, 1)
    ).to.equal(ethers.utils.parseEther("23500000000000000000"));
    expect(
      await starsMasterChef.accStarsPerShareAtCurrRate(350000, 1)
    ).to.equal(ethers.utils.parseEther("35000000000000000000"));
    expect(
      await starsMasterChef.accStarsPerShareAtCurrRate(600000, 1)
    ).to.equal(ethers.utils.parseEther("40000000000000000000"));
    expect(
      await starsMasterChef.accStarsPerShareAtCurrRate(700000, 1)
    ).to.equal(ethers.utils.parseEther("40000000000000000000"));
  });

  it("grants & revokes admin permissions", async () => {
    const adminRole = await starsMasterChef.ROLE_ADMIN();

    try {
      await (
        await starsMasterChef
          .connect(signers[1])
          .grantRole(adminRole, signers[2].address)
      ).wait();
      expect(false).to.be.true;
    } catch (e) {
      expect(e.message).to.match(/sender must be an admin to grant/);
    }

    await (
      await starsMasterChef.grantRole(adminRole, signers[2].address)
    ).wait();
    expect(await starsMasterChef.hasRole(adminRole, signers[2].address)).to.be
      .true;

    await (
      await starsMasterChef.revokeRole(adminRole, signers[2].address)
    ).wait();

    expect(await starsMasterChef.hasRole(adminRole, signers[2].address)).to.be
      .false;
  });

  it("adds pools correctly", async () => {
    await (await starsMasterChef.add(150, token2.address, true)).wait();
    const pool1 = await starsMasterChef.poolInfo(1);
    expect(pool1.allocPoint).to.equal(150);
    expect(pool1.accStarsPerShare).to.equal(0);
    expect(pool1.poolSupply).to.equal(0);
    expect(pool1.lpToken).to.equal(token2.address);

    expect(await starsMasterChef.totalAllocPoint()).to.equal(250);
  });

  it("sets pools correctly", async () => {
    await (await starsMasterChef.set(0, 200, true)).wait();
    const pool0 = await starsMasterChef.poolInfo(0);
    expect(pool0.allocPoint).to.equal(200);

    expect(await starsMasterChef.totalAllocPoint()).to.equal(200);
  });
});
