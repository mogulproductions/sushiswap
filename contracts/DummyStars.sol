// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DummyStars is ERC20("DummyStars", "DMS") {
    constructor() public {
        _mint(msg.sender, 100000 ether);
    }
}
