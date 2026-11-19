// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AirdropGate} from "../src/AirdropGate.sol";
import {MockAgentId} from "../test/mocks/MockAgentId.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/// @notice Deploys AirdropGate to BSC testnet (chain 97) with a mock Agent ID
/// contract and a demo ERC-20, since the real Agent ID contract only exists on
/// mainnet. For mainnet, deploy AirdropGate with the real Agent ID address
/// 0x60b9262456de011f7d15a54cdd8c48baaa8b022f as the constructor argument.
/// @dev Run: forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address agentId = vm.envAddress("AGENT_ID_ADDRESS"); // 0x0 => deploy mock

        vm.startBroadcast(deployerKey);

        address agentIdAddr = agentId;
        if (agentIdAddr == address(0)) {
            MockAgentId mock = new MockAgentId();
            agentIdAddr = address(mock);
            console.log("MockAgentId deployed:", agentIdAddr);
        }

        MockERC20 demoToken = new MockERC20();
        console.log("DemoToken deployed:", address(demoToken));

        AirdropGate gate = new AirdropGate(agentIdAddr);
        console.log("AirdropGate deployed:", address(gate));
        console.log("Agent ID used:", agentIdAddr);

        vm.stopBroadcast();
    }
}
