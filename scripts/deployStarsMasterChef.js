const { parseEther } = require("ethers/lib/utils");
const hre = require("hardhat");

async function main() {
  let signers = await ethers.getSigners();
  const owner = signers[0].address;

  const StarsMasterChef = await ethers.getContractFactory("StarsMasterChef");
  const Stars = await ethers.getContractFactory("DummyStars");

  stars = await Stars.deploy(
    [signers[0].address, "0x9577f62E26389C4a301A892672e53188CD735bDF"],
    [
      ethers.utils.parseEther("1000000000"),
      ethers.utils.parseEther("1000000000"),
    ]
  );
  await stars.deployed();
  console.log("Stars deployed to: ", stars.address);

  starsMasterChef = await StarsMasterChef.deploy(
    stars.address,
    signers[0].address,
    [
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("70"),
      ethers.utils.parseEther("20"),
    ],
    [120, 240, 360]
  );
  await starsMasterChef.deployed();
  console.log("StarsMasterChef deployed to: ", starsMasterChef.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
