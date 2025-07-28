import {TonContractAdapter} from './ton-contract-adapter'
import {TonCrossChainOrder} from '../../cross-chain-order/ton/ton-cross-chain-order'
import {TonAddress} from '../../domains/addresses'
import {HashLock} from '../../domains/hash-lock'
import {TimeLocks} from '../../domains/time-locks'
import {AuctionDetails} from '../../domains/auction-details'
import {NetworkEnum, TonChain, SupportedChain} from '../../chains'

describe('TonContractAdapter', () => {
    let adapter: TonContractAdapter
    let mockOrder: TonCrossChainOrder

    beforeAll(() => {
        adapter = new TonContractAdapter()

        // Create a mock order for testing using the working pattern from existing tests
        const orderInfo = {
            makerAsset: TonAddress.fromString(
                'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
            ),
            takerAsset: TonAddress.fromString(
                'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
            ),
            maker: TonAddress.fromString(
                'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
            ),
            makingAmount: 1000000000n, // 1 TON
            takingAmount: 2000n * 10n ** 6n, // 2000 USDC
            receiver: TonAddress.fromString(
                'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
            )
        }

        const escrowParams = {
            hashLock: HashLock.fromString(
                '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            ),
            srcChainId: NetworkEnum.TON_MAINNET as TonChain,
            dstChainId: NetworkEnum.ETHEREUM as SupportedChain,
            srcSafetyDeposit: 0n,
            dstSafetyDeposit: 0n,
            timeLocks: TimeLocks.new({
                srcWithdrawal: 1n,
                srcPublicWithdrawal: 2n,
                srcCancellation: 3n,
                srcPublicCancellation: 4n,
                dstWithdrawal: 1n,
                dstPublicWithdrawal: 2n,
                dstCancellation: 3n
            })
        }

        const details = {
            auction: AuctionDetails.noAuction(
                120n,
                BigInt(Math.floor(Date.now() / 1000))
            )
        }

        mockOrder = TonCrossChainOrder.new(orderInfo, escrowParams, details)
    })

    describe('detectDirection', () => {
        it('should detect TON_TO_EVM direction for TON source chain', async () => {
            const result = await adapter.submitOrder(mockOrder)
            expect(result).toContain('TON_SRC_ESCROW_')
        })
    })

    describe('submitOrder', () => {
        it('should create source escrow for TON → EVM swaps', async () => {
            const result = await adapter.submitOrder(mockOrder)
            expect(result).toBeDefined()
            expect(typeof result).toBe('string')
            expect(result).toContain('TON_SRC_ESCROW_')
        })
    })

    describe('getEscrowAddress', () => {
        it('should return valid TON address', async () => {
            const address = await adapter.getEscrowAddress(mockOrder)
            expect(address).toBeInstanceOf(TonAddress)
            expect(address.toString()).toBeDefined()
        })
    })

    describe('getTonContractOrderHash', () => {
        it('should generate consistent hash for same order', () => {
            const hash1 = mockOrder.getTonContractOrderHash()
            const hash2 = mockOrder.getTonContractOrderHash()

            expect(hash1).toEqual(hash2)
            expect(hash1).toBeInstanceOf(Buffer)
            expect(hash1.length).toBe(32) // 256 bits = 32 bytes
        })

        it('should generate different hashes for different orders', () => {
            const order2Info = {
                makerAsset: TonAddress.fromString(
                    'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
                ),
                takerAsset: TonAddress.fromString(
                    'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
                ),
                maker: TonAddress.fromString(
                    'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
                ),
                makingAmount: 2000000000n, // Different amount
                takingAmount: 2000n * 10n ** 6n,
                receiver: TonAddress.fromString(
                    'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
                )
            }

            const order2EscrowParams = {
                hashLock: HashLock.fromString(
                    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
                ),
                srcChainId: NetworkEnum.TON_MAINNET as TonChain,
                dstChainId: NetworkEnum.ETHEREUM as SupportedChain,
                srcSafetyDeposit: 0n,
                dstSafetyDeposit: 0n,
                timeLocks: TimeLocks.new({
                    srcWithdrawal: 1n,
                    srcPublicWithdrawal: 2n,
                    srcCancellation: 3n,
                    srcPublicCancellation: 4n,
                    dstWithdrawal: 1n,
                    dstPublicWithdrawal: 2n,
                    dstCancellation: 3n
                })
            }

            const order2Details = {
                auction: AuctionDetails.noAuction(
                    120n,
                    BigInt(Math.floor(Date.now() / 1000))
                )
            }

            const order2 = TonCrossChainOrder.new(
                order2Info,
                order2EscrowParams,
                order2Details
            )

            const hash1 = mockOrder.getTonContractOrderHash()
            const hash2 = order2.getTonContractOrderHash()

            expect(hash1).not.toEqual(hash2)
        })
    })

    describe('validateSecret', () => {
        it('should validate positive secrets', async () => {
            const address = TonAddress.fromString(
                'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
            )
            const result = await adapter.validateSecret(address, 12345n)
            expect(result).toBe(true)
        })

        it('should reject zero secret', async () => {
            const address = TonAddress.fromString(
                'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
            )
            const result = await adapter.validateSecret(address, 0n)
            expect(result).toBe(false)
        })
    })

    describe('withdraw', () => {
        it('should return transaction hash', async () => {
            const address = TonAddress.fromString(
                'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ'
            )
            const result = await adapter.withdraw(address, 12345n)
            expect(result).toBeDefined()
            expect(typeof result).toBe('string')
            expect(result).toContain('WITHDRAW_TX_')
        })
    })
})
