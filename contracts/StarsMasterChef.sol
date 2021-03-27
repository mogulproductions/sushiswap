// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract StarsMasterChef is AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    bytes32 public constant ROLE_ADMIN = keccak256("ROLE_ADMIN");

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many Stars the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of Stars
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accStarsPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws Stars to the pool. Here's what happens:
        //   1. The pool's `accStarsPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    uint256 lastRewardBlock; // Last block number that Stars distribution occurs.
    uint256 accStarsPerShare; // Accumulated Stars per share.

    uint256 poolSupply;

    // The Stars token
    IERC20 public stars;
    IERC20 public stakingToken;
    // Info of each user that stakes Stars.
    mapping(address => UserInfo) public userInfo;
    // The block number when Stars staking starts.
    uint256 public startBlock;
    event RewardsCollected(address indexed user);
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    modifier onlyAdmin {
        require(hasRole(ROLE_ADMIN, msg.sender), "Sender is not admin");
        _;
    }

    /**
     * @dev Sets the start block and the first admin,
     * and stores the Stars contract. Allows users with the admin role to
     * grant/revoke the admin role from other users.
     *
     * Params:
     * starsAddress: the address of the Stars contract
     * _startBlock: the block number for staking to begin
     * _admin: the address of the first admin
     */
    constructor(
        address starsAddress,
        address stakingTokenAddress,
        uint256 _startBlock,
        address _admin
    ) public {
        _setupRole(ROLE_ADMIN, _admin);
        _setRoleAdmin(ROLE_ADMIN, ROLE_ADMIN);

        stars = IERC20(starsAddress);
        stakingToken = IERC20(stakingTokenAddress);
        startBlock = _startBlock;

        stars.safeTransferFrom(msg.sender, 40000000 ether);
    }

    /**
     * @dev View function to see pending Stars on frontend.
     *
     * Params:
     * _user: address of the stars to view the pending rewards for.
     */
    function pendingStars(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[msg.sender];
        uint256 currRateEndStarsPerShare =
            accStarsPerShareAtCurrRate(block.number - startBlock);
        uint256 currRateStartStarsPerShare =
            accStarsPerShareAtCurrRate(block.number - lastRewardBlock);

        uint256 pendingAccStarsPerShare =
            accStarsPerShare.add(
                currRateStartStarsPerShare.sub(currRateEndStarsPerShare)
            );
        return user.amount.mul(pendingAccStarsPerShare).sub(user.rewardDebt);
    }

    /**
     * @dev An internal function to calculate the total accumulated Stars per
     * share, assuming the stars per share remained the same since staking
     * began.
     *
     * Params:
     * blocks: The number of blocks to calculate for
     */
    function accStarsPerShareAtCurrRate(uint256 blocks)
        internal
        view
        returns (uint256)
    {
        if (blocks >= 600000) {
            return 400000000 ether;
        } else if (blocks >= 300000) {
            uint256 currTierRewards = (blocks.sub(300000).mul(20 ether));
            return currTierRewards.add(340000000 ether);
        } else if (blocks >= 100000) {
            uint256 currTierRewards = (blocks.sub(100000).mul(70 ether));
            return currTierRewards.add(200000000 ether);
        } else {
            return blocks.mul(200 ether);
        }
    }

    /**
     * @dev Calculates the additional stars per share that have been accumulated
     * since lastRewardBlock, and updates accStarsPerShare and lastRewardBlock
     * accordingly.
     */
    function updatePool() public {
        if (block.number <= lastRewardBlock) {
            return;
        }
        uint256 currRateEndStarsPerShare =
            accStarsPerShareAtCurrRate(block.number - startBlock);
        uint256 currRateStartStarsPerShare =
            accStarsPerShareAtCurrRate(block.number - lastRewardBlock);

        accStarsPerShare = accStarsPerShare.add(
            currRateStartStarsPerShare.sub(currRateEndStarsPerShare)
        );
        lastRewardBlock = block.number;
    }

    function collectRewards() public {
      UserInfo storage user = userInfo[msg.sender];
      updatePool();

      if (user.amount > 0) {
          uint256 pending =
              user.amount.mul(accStarsPerShare).sub(user.rewardDebt);
          safeStarsTransfer(msg.sender, pending);
      }
      user.rewardDebt = user.rewardDebt.add(pending);
      emit RewardsCollected(msg.sender);
    }

    /**
     * @dev Deposit stars for staking. The sender's pending rewards may be
     * sent to the sender, and the sender's information is updated accordingly.
     *
     * Params:
     * _amount: amount of Stars to deposit
     * collectRewards: whether or not to collect pending rewards.
     */
    function deposit(uint256 _amount, bool collectRewards) public {
        UserInfo storage user = userInfo[msg.sender];
        updatePool();
        stakingToken.safeTransferFrom(address(msg.sender), address(this), _amount);
        user.amount = user.amount.add(_amount);

        if (collectRewards) {
          if (user.amount > 0) {
              uint256 pending =
                  user.amount.mul(accStarsPerShare).sub(user.rewardDebt);
              safeStarsTransfer(msg.sender, pending);
          }
          user.rewardDebt = user.rewardDebt.sub(pending);
          emit RewardsCollected(msg.sender);
        }
        emit Deposit(msg.sender, _amount);
    }

    /**
     * @dev Withdraw Stars from the amount that the user is staking.
     *
     * Params:
     * _amount: amount of Stars to withdraw
     *
     * Requirements:
     * _amount is less than or equal to the amount of Stars the the user has
     * deposited to the contract
     * collectRewards: whether or not to collect pending rewards.
     */
    function withdraw(uint256 _amount, bool collectRewards) public {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool();
        user.amount = user.amount.sub(_amount);
        stakingToken.safeTransfer(address(msg.sender), _amount);

        if (collectRewards) {
          uint256 pending =
              user.amount.mul(accStarsPerShare).sub(user.rewardDebt);
          safeStarsTransfer(msg.sender, pending);

          user.rewardDebt = user.rewardDebt.sub(pending);
        }
        emit Withdraw(msg.sender, _amount);
    }

    /**
     * @dev Withdraw without caring about rewards. EMERGENCY ONLY.
     */
    function emergencyWithdraw() public {
        UserInfo storage user = userInfo[msg.sender];
        stars.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    /**
     * @dev Safe sushi transfer function, just in case if rounding error causes
     * pool to not have enough Stars.
     *
     * Params:
     * _to: address to send Stars to
     * _amount: amount of Stars to send
     */
    function safeStarsTransfer(address _to, uint256 _amount) internal {
        uint256 starsBal = stars.balanceOf(address(this));
        if (_amount > starsBal) {
            stars.transfer(_to, starsBal);
        } else {
            stars.transfer(_to, _amount);
        }
    }
}
