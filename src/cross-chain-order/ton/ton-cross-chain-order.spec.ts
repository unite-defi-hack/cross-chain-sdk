import {TonCrossChainOrder} from './ton-cross-chain-order'
import {TonAddress} from '../../domains/addresses/ton-address'
import {EvmAddress} from '../../domains/addresses/evm-address'
import {HashLock} from '../../domains/hash-lock'
import {TimeLocks} from '../../domains/time-locks'
import {AuctionDetails} from '../../domains/auction-details'
import {NetworkEnum, TonChain, SupportedChain} from '../../chains'
import {now} from '../../utils/time'

describe('TonCrossChainOrder', () => {
    const TEST_ADDRESSES = {
        TON_MAKER: 'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ',
        TON_TOKEN: 'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ', // Same for test
        EVM_RECEIVER: '0x1234567890123456789012345678901234567890',
        EVM_TOKEN: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    }

    const createTestOrder = () => {
        const orderInfo = {
            makerAsset: TonAddress.fromString(TEST_ADDRESSES.TON_TOKEN),
            takerAsset: EvmAddress.fromString(TEST_ADDRESSES.EVM_TOKEN),
            makingAmount: 1000000000n, // 1 TON
            takingAmount: 2000n * 10n ** 6n, // 2000 USDC
            maker: TonAddress.fromString(TEST_ADDRESSES.TON_MAKER),
            receiver: EvmAddress.fromString(TEST_ADDRESSES.EVM_RECEIVER)
        }

        const escrowParams = {
            hashLock: HashLock.forSingleFill('0x' + '12'.repeat(32)),
            srcChainId: NetworkEnum.TON_MAINNET as TonChain,
            dstChainId: NetworkEnum.ETHEREUM as SupportedChain,
            srcSafetyDeposit: 100000000n, // 0.1 TON
            dstSafetyDeposit: 50n * 10n ** 6n, // 50 USDC
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
            auction: AuctionDetails.noAuction(120n, BigInt(now()))
        }

        return TonCrossChainOrder.new(orderInfo, escrowParams, details)
    }

    describe('Order Creation', () => {
        it('should create a new TON cross-chain order', () => {
            const order = createTestOrder()

            expect(order).toBeInstanceOf(TonCrossChainOrder)
            expect(order.maker.toString()).toContain(TEST_ADDRESSES.TON_MAKER.substring(0, 10))
            expect(order.makerAsset.toString()).toContain(TEST_ADDRESSES.TON_TOKEN.substring(0, 10))
            expect(order.makingAmount).toBe(1000000000n)
            expect(order.takingAmount).toBe(2000n * 10n ** 6n)
        })

        it('should handle native TON asset', () => {
            const orderInfo = {
                makerAsset: TonAddress.NATIVE,
                takerAsset: EvmAddress.fromString(TEST_ADDRESSES.EVM_TOKEN),
                makingAmount: 1000000000n,
                takingAmount: 2000n * 10n ** 6n,
                maker: TonAddress.fromString(TEST_ADDRESSES.TON_MAKER),
                receiver: EvmAddress.fromString(TEST_ADDRESSES.EVM_RECEIVER)
            }

            const escrowParams = {
                hashLock: HashLock.forSingleFill('0x' + '12'.repeat(32)),
                srcChainId: NetworkEnum.TON_MAINNET as TonChain,
                dstChainId: NetworkEnum.ETHEREUM as SupportedChain,
                srcSafetyDeposit: 100000000n,
                dstSafetyDeposit: 50n * 10n ** 6n,
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
                auction: AuctionDetails.noAuction(120n, BigInt(now()))
            }

            const order = TonCrossChainOrder.new(orderInfo, escrowParams, details)

            expect(order.srcAssetIsNative).toBe(true)
            expect(order.makerAsset.toString()).toBe(TonAddress.WRAPPED_NATIVE.toString())
        })

        it('should validate chain requirements', () => {
            const orderInfo = {
                makerAsset: TonAddress.fromString(TEST_ADDRESSES.TON_TOKEN),
                takerAsset: EvmAddress.fromString(TEST_ADDRESSES.EVM_TOKEN),
                makingAmount: 1000000000n,
                takingAmount: 2000n * 10n ** 6n,
                maker: TonAddress.fromString(TEST_ADDRESSES.TON_MAKER)
                // No receiver for cross-chain
            }

            const escrowParams = {
                hashLock: HashLock.forSingleFill('0x' + '12'.repeat(32)),
                srcChainId: NetworkEnum.TON_MAINNET as TonChain,
                dstChainId: NetworkEnum.ETHEREUM as SupportedChain,
                srcSafetyDeposit: 100000000n,
                dstSafetyDeposit: 50n * 10n ** 6n,
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
                auction: AuctionDetails.noAuction(120n, BigInt(now()))
            }

            expect(() => {
                TonCrossChainOrder.new(orderInfo, escrowParams, details)
            }).toThrow('Receiver is required for cross-chain orders')
        })

        it('should reject same source and destination chains', () => {
            const orderInfo = {
                makerAsset: TonAddress.fromString(TEST_ADDRESSES.TON_TOKEN),
                takerAsset: TonAddress.fromString(TEST_ADDRESSES.TON_TOKEN),
                makingAmount: 1000000000n,
                takingAmount: 2000n * 10n ** 6n,
                maker: TonAddress.fromString(TEST_ADDRESSES.TON_MAKER),
                receiver: TonAddress.fromString(TEST_ADDRESSES.TON_MAKER)
            }

            const escrowParams = {
                hashLock: HashLock.forSingleFill('0x' + '12'.repeat(32)),
                srcChainId: NetworkEnum.TON_MAINNET as TonChain,
                dstChainId: NetworkEnum.TON_MAINNET as SupportedChain, // Same chain
                srcSafetyDeposit: 100000000n,
                dstSafetyDeposit: 50n * 10n ** 6n,
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
                auction: AuctionDetails.noAuction(120n, BigInt(now()))
            }

            expect(() => {
                TonCrossChainOrder.new(orderInfo, escrowParams, details)
            }).toThrow('Chains must be different')
        })
    })

    describe('Order Properties', () => {
        let order: TonCrossChainOrder

        beforeEach(() => {
            order = createTestOrder()
        })

        it('should expose correct properties', () => {
            expect(order.dstChainId).toBe(NetworkEnum.ETHEREUM)
            expect(order.srcSafetyDeposit).toBe(100000000n)
            expect(order.dstSafetyDeposit).toBe(50n * 10n ** 6n)
            expect(order.partialFillAllowed).toBe(true)
            expect(order.multipleFillsAllowed).toBe(true)
            expect(order.srcAssetIsNative).toBe(false)
        })

        it('should have valid auction times', () => {
            const startTime = order.auctionStartTime
            const endTime = order.auctionEndTime
            const deadline = order.deadline

            expect(endTime).toBeGreaterThan(startTime)
            expect(deadline).toBeGreaterThan(endTime)
            expect(Number(endTime - startTime)).toBe(120) // 120 seconds duration
        })

        it('should expose hash lock and time locks', () => {
            expect(order.hashLock).toBeInstanceOf(HashLock)
            expect(order.timeLocks).toBeInstanceOf(TimeLocks)
        })
    })

    describe('Order Serialization', () => {
        let order: TonCrossChainOrder

        beforeEach(() => {
            order = createTestOrder()
        })

        it('should serialize to JSON', () => {
            const json = order.toJSON()

            expect(json.orderInfo.srcToken).toContain('EQ')
            expect(json.orderInfo.dstToken).toBe(TEST_ADDRESSES.EVM_TOKEN)
            expect(json.orderInfo.maker).toContain('EQ')
            expect(json.orderInfo.receiver).toBe(TEST_ADDRESSES.EVM_RECEIVER)
            expect(json.orderInfo.srcAmount).toBe('1000000000')
            expect(json.orderInfo.minDstAmount).toBe('2000000000')

            expect(json.escrowParams.srcChainId).toBe(NetworkEnum.TON_MAINNET)
            expect(json.escrowParams.dstChainId).toBe(NetworkEnum.ETHEREUM)
            expect(json.escrowParams.srcSafetyDeposit).toBe('100000000')
            expect(json.escrowParams.dstSafetyDeposit).toBe('50000000')

            expect(json.extra.srcAssetIsNative).toBe(false)
            expect(json.extra.allowMultipleFills).toBe(true)
            expect(json.extra.allowPartialFills).toBe(true)
        })

        it('should deserialize from JSON', () => {
            const json = order.toJSON()
            const deserialized = TonCrossChainOrder.fromJSON(json)

            expect(deserialized.maker.toString()).toBe(order.maker.toString())
            expect(deserialized.makerAsset.toString()).toBe(order.makerAsset.toString())
            expect(deserialized.makingAmount).toBe(order.makingAmount)
            expect(deserialized.takingAmount).toBe(order.takingAmount)
            expect(deserialized.dstChainId).toBe(order.dstChainId)
            expect(deserialized.srcAssetIsNative).toBe(order.srcAssetIsNative)
        })

        it('should maintain JSON round-trip consistency', () => {
            const json1 = order.toJSON()
            const deserialized = TonCrossChainOrder.fromJSON(json1)
            const json2 = deserialized.toJSON()

            expect(json1).toEqual(json2)
        })
    })

    describe('Order Hashing', () => {
        let order: TonCrossChainOrder

        beforeEach(() => {
            order = createTestOrder()
        })

        it('should generate consistent order hash', () => {
            const hash1 = order.getOrderHash(NetworkEnum.TON_MAINNET)
            const hash2 = order.getOrderHash(NetworkEnum.TON_MAINNET)

            expect(hash1).toBe(hash2)
            expect(hash1).toHaveLength(64) // 32 bytes = 64 hex chars
        })

        it('should generate different hashes for different orders', () => {
            const order2Info = {
                makerAsset: TonAddress.fromString(TEST_ADDRESSES.TON_TOKEN),
                takerAsset: EvmAddress.fromString(TEST_ADDRESSES.EVM_TOKEN),
                makingAmount: 2000000000n, // Different amount
                takingAmount: 2000n * 10n ** 6n,
                maker: TonAddress.fromString(TEST_ADDRESSES.TON_MAKER),
                receiver: EvmAddress.fromString(TEST_ADDRESSES.EVM_RECEIVER)
            }

            const escrowParams = {
                hashLock: HashLock.forSingleFill('0x' + '12'.repeat(32)),
                srcChainId: NetworkEnum.TON_MAINNET as TonChain,
                dstChainId: NetworkEnum.ETHEREUM as SupportedChain,
                srcSafetyDeposit: 100000000n,
                dstSafetyDeposit: 50n * 10n ** 6n,
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
                auction: AuctionDetails.noAuction(120n, BigInt(now()))
            }

            const order2 = TonCrossChainOrder.new(order2Info, escrowParams, details)

            const hash1 = order.getOrderHash(NetworkEnum.TON_MAINNET)
            const hash2 = order2.getOrderHash(NetworkEnum.TON_MAINNET)

            expect(hash1).not.toBe(hash2)
        })

        it('should generate order hash buffer', () => {
            const hashBuffer = order.getOrderHashBuffer(NetworkEnum.TON_MAINNET)

            expect(hashBuffer).toBeInstanceOf(Buffer)
            expect(hashBuffer.length).toBe(32) // 32 bytes
        })
    })

    describe('Auction Calculator', () => {
        let order: TonCrossChainOrder

        beforeEach(() => {
            order = createTestOrder()
        })

        it('should provide auction calculator', () => {
            const calculator = order.getCalculator()

            expect(calculator).toBeDefined()
            // Calculator should have zero taker fee for TON
            expect(calculator.calcRateBump(order.auctionStartTime, 0n)).toBeGreaterThanOrEqual(0n)
        })

        it('should calculate taking amounts', () => {
            const currentTime = order.auctionStartTime + 60n // 1 minute into auction
            const takingAmount = order.calcTakingAmount(order.makingAmount, currentTime)

            expect(takingAmount).toBeGreaterThanOrEqual(order.takingAmount)
        })
    })

    describe('Static Methods', () => {
        it('should calculate expiration delay correctly', () => {
            const startTime = 1000n
            const duration = 120n
            const deadline = 1140n // 20 seconds after auction ends

            const expirationDelay = TonCrossChainOrder.calcExpirationDelay(
                deadline,
                startTime,
                duration
            )

            expect(expirationDelay).toBe(20n)
        })

        it('should generate static order hash buffer', () => {
            const order = createTestOrder()
            const params = {
                hashLock: order.hashLock,
                maker: order.maker,
                makerAsset: order.makerAsset,
                makingAmount: order.makingAmount,
                srcSafetyDeposit: order.srcSafetyDeposit,
                timeLocks: order.timeLocks,
                deadline: order.deadline,
                srcAssetIsNative: order.srcAssetIsNative,
                takingAmount: order.takingAmount,
                salt: order.salt,
                multipleFillsAllowed: order.multipleFillsAllowed,
                partialFillsAllowed: order.partialFillAllowed,
                auction: order.auction
            }

            const hash1 = TonCrossChainOrder.getOrderHashBuffer(params)
            const hash2 = order.getOrderHashBuffer(NetworkEnum.TON_MAINNET)

            expect(hash1).toEqual(hash2)
        })
    })
})