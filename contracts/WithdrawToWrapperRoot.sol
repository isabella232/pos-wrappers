//SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.13;

import "./lib/IERC20Predicate.sol";

contract WithdrawToWrapperRoot {
    IERC20Predicate public immutable erc20Predicate;

    constructor(IERC20Predicate _erc20Predicate) {
        erc20Predicate = _erc20Predicate;
    }

    function exit() external {
        // Use PoS to exit tokens
        // Use SEND_MESSAGE_EVENT_SIG to exit to person
    }
}
