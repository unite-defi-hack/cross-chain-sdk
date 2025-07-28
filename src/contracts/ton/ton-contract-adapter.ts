import {TonCrossChainOrder} from '../../cross-chain-order/ton/ton-cross-chain-order'
import {TonAddress} from '../../domains/addresses'
import {isTon} from '../../chains'

/**
 * Temporary adapter to handle interface differences between src/dst escrows
 * Will be removed when TON contracts are unified
 */
export class TonContractAdapter {
    /**
     * Detect swap direction based on source chain
     */
    private detectDirection(
        order: TonCrossChainOrder
    ): 'TON_TO_EVM' | 'EVM_TO_TON' {
        // Current implementation assumes TON is always source
        // When EVM → TON is implemented, this will need to check both src and dst chains
        return isTon(order.srcChainId) ? 'TON_TO_EVM' : 'EVM_TO_TON'
    }

    /**
     * Submit order to appropriate TON contract based on direction
     */
    async submitOrder(order: TonCrossChainOrder): Promise<string> {
        const direction = this.detectDirection(order)
        const orderHash = order.getTonContractOrderHash()

        if (direction === 'TON_TO_EVM') {
            return this.createSrcEscrow(order, orderHash)
        } else {
            return this.createDstEscrow(order, orderHash)
        }
    }

    /**
     * Create source escrow for TON → EVM swaps
     * Uses Limit Order Protocol (lop.fc) to create src_escrow
     */
    private async createSrcEscrow(
        order: TonCrossChainOrder,
        orderHash: Buffer
    ): Promise<string> {
        // Convert order data to src_escrow format
        const srcEscrowParams = {
            maker_address: order.maker.toString(), // TON address (slice)
            maker_asset: order.makerAsset.toString(), // TON asset (slice)
            making_amount: order.makingAmount, // TON amount (coins)
            receiver_address: order.receiver.toBigint(), // EVM address (uint256)
            taker_asset: order.takerAsset.toBigint(), // EVM asset (uint256)
            taking_amount: order.takingAmount, // EVM amount (uint128)
            salt: order.salt, // Order salt (uint256)
            hashlock: BigInt(order.hashLock.toString()), // Secret hash (uint256)
            creation_time: Math.floor(Date.now() / 1000), // Current time (uint32)
            expiration_time:
                Math.floor(Date.now() / 1000) + Number(order.deadline) // Future time (uint32)
        }

        // TODO: Replace with actual Limit Order Protocol contract call
        // return await limitOrderProtocol.createOrder(srcEscrowParams)

        // For now, return mock escrow address
        return `TON_SRC_ESCROW_${orderHash.toString('hex').slice(0, 8)}`
    }

    /**
     * Create destination escrow for EVM → TON swaps
     * Uses destination escrow factory to create dst_escrow
     */
    private async createDstEscrow(
        order: TonCrossChainOrder,
        orderHash: Buffer
    ): Promise<string> {
        // Convert order data to dst_escrow format (different from src!)
        const dstEscrowParams = {
            maker_address: order.maker.toBigint(), // EVM address (uint256)
            maker_asset: order.makerAsset.toBigint(), // EVM asset (uint256)
            maker_asset_amount: order.makingAmount, // EVM amount (uint128)
            receiver_address: order.receiver.toString(), // TON address (slice)
            taker_addr: order.maker.toString(), // TON taker (slice)
            taker_asset_addr: order.takerAsset.toString(), // TON asset (slice)
            taker_asset_amount: order.takingAmount, // TON amount (coins)
            hashlock: BigInt(order.hashLock.toString()), // Secret hash (uint256)
            creation_time: Math.floor(Date.now() / 1000), // Current time (uint32)
            expiration_time:
                Math.floor(Date.now() / 1000) + Number(order.deadline) // Future time (uint32)
        }

        // TODO: Replace with actual destination escrow factory contract call
        // return await dstEscrowFactory.createOrder(dstEscrowParams)

        // For now, return mock escrow address
        return `TON_DST_ESCROW_${orderHash.toString('hex').slice(0, 8)}`
    }

    /**
     * Get escrow address for existing order
     */
    async getEscrowAddress(order: TonCrossChainOrder): Promise<TonAddress> {
        const direction = this.detectDirection(order)
        const orderHash = order.getTonContractOrderHash()

        if (direction === 'TON_TO_EVM') {
            return this.getSrcEscrowAddress(order, orderHash)
        } else {
            return this.getDstEscrowAddress(order, orderHash)
        }
    }

    /**
     * Calculate source escrow address (deterministic from order hash)
     */
    private async getSrcEscrowAddress(
        order: TonCrossChainOrder,
        orderHash: Buffer
    ): Promise<TonAddress> {
        // TODO: Replace with actual contract address calculation
        // const stateInit = calculateSrcEscrowStateInit(order.maker, orderHash)
        // return calculateContractAddress(stateInit)

        // For now, return mock address
        return TonAddress.fromString(
            `EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ`
        )
    }

    /**
     * Calculate destination escrow address (deterministic from order hash)
     */
    private async getDstEscrowAddress(
        order: TonCrossChainOrder,
        orderHash: Buffer
    ): Promise<TonAddress> {
        // TODO: Replace with actual contract address calculation
        // const stateInit = calculateDstEscrowStateInit(order.maker, orderHash)
        // return calculateContractAddress(stateInit)

        // For now, return mock address
        return TonAddress.fromString(
            `EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ`
        )
    }

    /**
     * Withdraw from escrow using secret
     */
    async withdraw(escrowAddress: TonAddress, secret: bigint): Promise<string> {
        // TODO: Replace with actual contract interaction
        // const escrow = new TonEscrowContract(escrowAddress)
        // return await escrow.withdraw(secret)

        // For now, return mock transaction hash
        return `WITHDRAW_TX_${secret.toString(16).slice(0, 8)}`
    }

    /**
     * Check if secret is valid for given escrow
     */
    async validateSecret(
        escrowAddress: TonAddress,
        secret: bigint
    ): Promise<boolean> {
        // TODO: Replace with actual contract call
        // const escrow = new TonEscrowContract(escrowAddress)
        // return await escrow.get_secret_valid(secret)

        // For now, return mock validation
        return secret > 0n
    }
}
