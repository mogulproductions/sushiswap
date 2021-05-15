const { parseEther } = require("ethers/lib/utils");
const hre = require("hardhat");

async function main() {
  let signers = await ethers.getSigners();
  const owner = signers[0].address;

  const StarsMasterChef = await ethers.getContractFactory("StarsMasterChef");
  const Stars = await ethers.getContractFactory("DummyStars");

  stars = await Stars.deploy(
    ["0x1c3B019F6d5a38d3EEea65cc8AB8EcA8D61dCC70"],
    [ethers.utils.parseEther("10000000000000")]
  );
  await stars.deployed();
  console.log("Stars deployed to: ", stars.address);

  starsMasterChef = await StarsMasterChef.deploy(
    stars.address,
    "0x1c3B019F6d5a38d3EEea65cc8AB8EcA8D61dCC70",
    [
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("70"),
      ethers.utils.parseEther("20"),
    ],
    [100000, 300000, 600000]
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
