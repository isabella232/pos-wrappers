//SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.13;

interface IChildToken {
    function withdraw(uint256 amount) external;

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}
