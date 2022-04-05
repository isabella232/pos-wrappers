//SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.13;

import {RLPReader} from "./lib/RLPReader.sol";
import {MerklePatriciaProof} from "./lib/MerklePatriciaProof.sol";
import {Merkle} from "./lib/Merkle.sol";
import "./lib/ExitPayloadReader.sol";
import "./lib/IRootChain.sol";
import "./lib/IRootChainManager.sol";
import "./lib/IRootToken.sol";

contract WithdrawToWrapperRoot {
    using RLPReader for RLPReader.RLPItem;
    using Merkle for bytes32;
    using ExitPayloadReader for bytes;
    using ExitPayloadReader for ExitPayloadReader.ExitPayload;
    using ExitPayloadReader for ExitPayloadReader.Log;
    using ExitPayloadReader for ExitPayloadReader.LogTopics;
    using ExitPayloadReader for ExitPayloadReader.Receipt;
    IRootChainManager public immutable rootChainManager;
    IRootChain public immutable rootChain;

    bytes32 private constant SEND_MESSAGE_EVENT_SIG = 0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036;

    mapping(bytes32 => bool) public processedExits;

    constructor(IRootChain _rootChain, IRootChainManager _rootChainManager) {
        rootChain = _rootChain;
        rootChainManager = _rootChainManager;
    }

    function exit(bytes calldata _burnProof, bytes calldata _messageProof) external {
        rootChainManager.exit(_burnProof);
        // token -> contract

        (address rootToken, , uint256 amount, address destination) = abi.decode(
            _validateAndExtractMessage(_messageProof),
            (address, address, uint256, address)
        );
        // contract -> user

        require(IRootToken(rootToken).transferFrom(address(this), destination, amount), "TRANSFER_FAILED");
    }

    function _validateAndExtractMessage(bytes memory inputData) internal returns (bytes memory) {
        ExitPayloadReader.ExitPayload memory payload = inputData.toExitPayload();

        bytes memory branchMaskBytes = payload.getBranchMaskAsBytes();
        uint256 blockNumber = payload.getBlockNumber();
        // checking if exit has already been processed
        // unique exit is identified using hash of (blockNumber, branchMask, receiptLogIndex)
        bytes32 exitHash = keccak256(
            abi.encodePacked(
                blockNumber,
                // first 2 nibbles are dropped while generating nibble array
                // this allows branch masks that are valid but bypass exitHash check (changing first 2 nibbles only)
                // so converting to nibble array and then hashing it
                MerklePatriciaProof._getNibbleArray(branchMaskBytes),
                payload.getReceiptLogIndex()
            )
        );
        require(processedExits[exitHash] == false, "WITHDRAW: EXIT_ALREADY_PROCESSED");
        processedExits[exitHash] = true;

        ExitPayloadReader.Receipt memory receipt = payload.getReceipt();
        ExitPayloadReader.Log memory log = receipt.getLog();

        // check that emitting address is same
        require(log.getEmitter() == address(this), "WITHDRAW: INVALID_EMITTER");

        bytes32 receiptRoot = payload.getReceiptRoot();
        // verify receipt inclusion
        require(
            MerklePatriciaProof.verify(receipt.toBytes(), branchMaskBytes, payload.getReceiptProof(), receiptRoot),
            "WITHDRAW: INVALID_RECEIPT_PROOF"
        );

        // verify checkpoint inclusion
        _checkBlockMembershipInCheckpoint(
            blockNumber,
            payload.getBlockTime(),
            payload.getTxRoot(),
            receiptRoot,
            payload.getHeaderNumber(),
            payload.getBlockProof()
        );

        ExitPayloadReader.LogTopics memory topics = log.getTopics();

        require(
            bytes32(topics.getField(0).toUint()) == SEND_MESSAGE_EVENT_SIG, // topic0 is event sig
            "WITHDRAW: INVALID_SIGNATURE"
        );

        // received message data
        bytes memory message = abi.decode(log.getData(), (bytes)); // event decodes params again, so decoding bytes to get message
        return message;
    }

    function _checkBlockMembershipInCheckpoint(
        uint256 blockNumber,
        uint256 blockTime,
        bytes32 txRoot,
        bytes32 receiptRoot,
        uint256 headerNumber,
        bytes memory blockProof
    ) private view returns (uint256) {
        IRootChain.HeaderBlock memory headerBlock = rootChain.headerBlocks(headerNumber);

        require(
            keccak256(
                abi.encodePacked(
                    blockNumber, blockTime, txRoot, receiptRoot
                )
            ).checkMembership(
                blockNumber - headerBlock.start,
                headerBlock.root,
                blockProof
            ),
            "WITHDRAW: INVALID_HEADER"
        );
        return headerBlock.createdAt;
    }
}
