/* solhint-disable */
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

contract RootChain {
    struct HeaderBlock {
        bytes32 root;
        uint256 start;
        uint256 end;
        uint256 createdAt;
        address proposer;
    }

    mapping(uint256 => HeaderBlock) public headerBlocks;
}
