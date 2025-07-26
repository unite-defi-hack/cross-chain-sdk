import {AuctionCalculator, randBigInt} from '@1inch/fusion-sdk'
import {keccak256} from 'ethers'
import assert from 'assert'
import {Buffer} from 'buffer'
import {
    TonDetails,
    TonExtra,
    TonEscrowParams,
    TonCrossChainOrderInfo,
    OrderInfoData,
    TonOrderJSON,
    OrderHashParams
} from './types'
import {createAddress, AddressLike, TonAddress} from '../../domains/addresses'
import {AddressComplement} from '../../domains/addresses/address-complement'
import {isSupportedChain, isTon, SupportedChain} from '../../chains'
import {HashLock} from '../../domains/hash-lock'
import {TimeLocks} from '../../domains/time-locks'
import {BaseOrder} from '../base-order'
import {AuctionDetails} from '../../domains/auction-details'
import {injectTrackCode} from '../source-track'
import {bufferFromHex} from '../../utils/bytes'
import {now} from '../../utils/time'
import {BitMask, UINT_32_MAX, UINT_64_MAX} from '@1inch/byte-utils'
import {assertUInteger} from '../../utils'

export class TonCrossChainOrder extends BaseOrder<
    TonAddress,
    TonOrderJSON,
    AddressLike
> {
    private static TRACK_CODE_MASK = new BitMask(32n, 64n)

    private static DefaultExtra: Required<
        Omit<TonExtra, 'salt' | 'source'>
    > & Pick<TonExtra, 'salt' | 'source'> = {
        orderExpirationDelay: 12n,
        allowMultipleFills: true,
        allowPartialFills: true,
        srcAssetIsNative: false,
        source: 'sdk',
        salt: undefined
    }

    private readonly orderConfig: {
        srcToken: TonAddress
        dstToken: AddressLike
        maker: TonAddress
        receiver: AddressLike
        srcAmount: bigint
        minDstAmount: bigint
        deadline: bigint
        salt: bigint

        // extra
        srcAssetIsNative: boolean
        allowMultipleFills: boolean
        allowPartialFills: boolean
        orderExpirationDelay: bigint
        source: string
    }

    private readonly details: TonDetails
    private readonly escrowParams: TonEscrowParams

    private constructor(
        orderInfo: OrderInfoData,
        escrowParams: TonEscrowParams,
        details: TonDetails,
        extra: TonExtra
    ) {
        assert(
            isTon(escrowParams.srcChainId),
            `Not supported chain ${escrowParams.srcChainId}`
        )
        assert(
            isSupportedChain(escrowParams.dstChainId),
            `Not supported chain ${escrowParams.dstChainId}`
        )
        assert(
            escrowParams.srcChainId !== escrowParams.dstChainId,
            'Chains must be different'
        )

        super()

        const orderExpirationDelay =
            extra.orderExpirationDelay ??
            TonCrossChainOrder.DefaultExtra.orderExpirationDelay
        assertUInteger(orderExpirationDelay)

        const deadline =
            details.auction.startTime +
            details.auction.duration +
            orderExpirationDelay

        assertUInteger(deadline)
        assertUInteger(orderInfo.makingAmount)
        assertUInteger(orderInfo.takingAmount)

        const source = extra.source ?? TonCrossChainOrder.DefaultExtra.source!
        const isSaltContainsSource = extra.salt && extra.salt > UINT_32_MAX

        const salt = isSaltContainsSource
            ? extra.salt!
            : injectTrackCode(
                  extra.salt ?? randBigInt(UINT_32_MAX),
                  source,
                  TonCrossChainOrder.TRACK_CODE_MASK
              )

        assertUInteger(salt, UINT_64_MAX)

        this.details = details
        this.escrowParams = escrowParams
        this.orderConfig = {
            srcToken: orderInfo.makerAsset,
            dstToken: orderInfo.takerAsset,
            maker: orderInfo.maker,
            receiver: orderInfo.receiver || orderInfo.maker,
            srcAmount: orderInfo.makingAmount,
            minDstAmount: orderInfo.takingAmount,
            deadline,
            salt,
            source,
            srcAssetIsNative:
                extra.srcAssetIsNative ??
                TonCrossChainOrder.DefaultExtra.srcAssetIsNative,
            allowMultipleFills:
                extra.allowMultipleFills ??
                TonCrossChainOrder.DefaultExtra.allowMultipleFills,
            allowPartialFills:
                extra.allowPartialFills ??
                TonCrossChainOrder.DefaultExtra.allowPartialFills,
            orderExpirationDelay
        }
    }

    public get auction(): AuctionDetails {
        return this.details.auction
    }

    public get salt(): bigint {
        return this.orderConfig.salt
    }

    public get hashLock(): HashLock {
        return this.escrowParams.hashLock
    }

    public get timeLocks(): TimeLocks {
        return this.escrowParams.timeLocks
    }

    public get srcSafetyDeposit(): bigint {
        return this.escrowParams.srcSafetyDeposit
    }

    public get dstSafetyDeposit(): bigint {
        return this.escrowParams.dstSafetyDeposit
    }

    public get dstChainId(): SupportedChain {
        return this.escrowParams.dstChainId
    }

    public get maker(): TonAddress {
        return this.orderConfig.maker
    }

    public get makerAsset(): TonAddress {
        return this.orderConfig.srcToken
    }

    public get takerAsset(): AddressLike {
        return this.orderConfig.dstToken
    }

    public get makingAmount(): bigint {
        return this.orderConfig.srcAmount
    }

    public get takingAmount(): bigint {
        return this.orderConfig.minDstAmount
    }

    public get receiver(): AddressLike {
        return this.orderConfig.receiver
    }

    public get deadline(): bigint {
        return this.orderConfig.deadline
    }

    public get auctionStartTime(): bigint {
        return this.details.auction.startTime
    }

    public get auctionEndTime(): bigint {
        return this.auctionStartTime + this.details.auction.duration
    }

    public get partialFillAllowed(): boolean {
        return this.orderConfig.allowPartialFills
    }

    public get multipleFillsAllowed(): boolean {
        return this.orderConfig.allowMultipleFills
    }

    public get srcAssetIsNative(): boolean {
        return this.orderConfig.srcAssetIsNative
    }

    public get source(): string {
        return this.orderConfig.source
    }

    static new(
        orderInfo: TonCrossChainOrderInfo,
        escrowParams: TonEscrowParams,
        details: TonDetails,
        extra: TonExtra = {}
    ): TonCrossChainOrder {
        // For cross-chain orders with non-EVM destination, receiver is required
        if (!isTon(escrowParams.dstChainId) && !orderInfo.receiver) {
            throw new Error('Receiver is required for cross-chain orders')
        }

        const processedOrderInfo: OrderInfoData = {
            makerAsset: orderInfo.makerAsset.isNative()
                ? TonAddress.WRAPPED_NATIVE
                : orderInfo.makerAsset,
            takerAsset: orderInfo.takerAsset,
            makingAmount: orderInfo.makingAmount,
            takingAmount: orderInfo.takingAmount,
            maker: orderInfo.maker,
            salt: orderInfo.salt,
            receiver: orderInfo.receiver
        }

        const processedExtra: TonExtra = {
            ...extra,
            srcAssetIsNative: orderInfo.makerAsset.isNative()
        }

        return new TonCrossChainOrder(
            processedOrderInfo,
            escrowParams,
            details,
            processedExtra
        )
    }

    static fromJSON(data: TonOrderJSON): TonCrossChainOrder {
        return new TonCrossChainOrder(
            {
                makerAsset: TonAddress.fromString(data.orderInfo.srcToken),
                takerAsset: createAddress(
                    data.orderInfo.dstToken,
                    data.escrowParams.dstChainId
                ),
                makingAmount: BigInt(data.orderInfo.srcAmount),
                takingAmount: BigInt(data.orderInfo.minDstAmount),
                maker: TonAddress.fromString(data.orderInfo.maker),
                receiver: createAddress(
                    data.orderInfo.receiver,
                    data.escrowParams.dstChainId
                )
            },
            {
                hashLock: HashLock.fromString(data.escrowParams.hashLock),
                srcChainId: data.escrowParams.srcChainId,
                dstChainId: data.escrowParams.dstChainId,
                srcSafetyDeposit: BigInt(data.escrowParams.srcSafetyDeposit),
                dstSafetyDeposit: BigInt(data.escrowParams.dstSafetyDeposit),
                timeLocks: TimeLocks.fromBigInt(
                    BigInt(data.escrowParams.timeLocks)
                )
            },
            {
                auction: AuctionDetails.fromJSON({
                    ...data.details.auction,
                    gasCost: {gasBumpEstimate: '0', gasPriceEstimate: '0'}
                }),
                resolvingStartTime: data.details.resolvingStartTime
                    ? BigInt(data.details.resolvingStartTime)
                    : undefined
            },
            {
                srcAssetIsNative: data.extra.srcAssetIsNative,
                orderExpirationDelay: BigInt(data.extra.orderExpirationDelay),
                source: data.extra.source,
                allowMultipleFills: data.extra.allowMultipleFills,
                allowPartialFills: data.extra.allowPartialFills,
                salt: BigInt(data.extra.salt)
            }
        )
    }

    public toJSON(): TonOrderJSON {
        const auction = this.auction.toJSON()

        return {
            orderInfo: {
                srcToken: this.orderConfig.srcToken.toString(),
                dstToken: this.orderConfig.dstToken.toString(),
                maker: this.orderConfig.maker.toString(),
                srcAmount: this.orderConfig.srcAmount.toString(),
                minDstAmount: this.orderConfig.minDstAmount.toString(),
                receiver: this.orderConfig.receiver.toString()
            },
            escrowParams: {
                hashLock: this.hashLock.toString(),
                srcChainId: this.escrowParams.srcChainId,
                dstChainId: this.dstChainId,
                srcSafetyDeposit: this.escrowParams.srcSafetyDeposit.toString(),
                dstSafetyDeposit: this.escrowParams.dstSafetyDeposit.toString(),
                timeLocks: this.timeLocks.build().toString()
            },
            details: {
                auction: {
                    startTime: auction.startTime,
                    duration: auction.duration,
                    initialRateBump: auction.initialRateBump,
                    points: auction.points
                },
                resolvingStartTime: this.details.resolvingStartTime?.toString()
            },
            extra: {
                srcAssetIsNative: this.srcAssetIsNative,
                orderExpirationDelay: this.orderConfig.orderExpirationDelay.toString(),
                source: this.orderConfig.source,
                allowMultipleFills: this.multipleFillsAllowed,
                allowPartialFills: this.partialFillAllowed,
                // use only last bits because high ones set from source
                salt: (this.salt & UINT_32_MAX).toString()
            }
        }
    }

    public getOrderHash(srcChainId: number): string {
        return this.getOrderHashBuffer(srcChainId).toString('hex')
    }

    public getOrderHashBuffer(srcChainId: number): Buffer {
        return TonCrossChainOrder.getOrderHashBuffer({
            hashLock: this.hashLock,
            maker: this.maker,
            makerAsset: this.makerAsset,
            makingAmount: this.makingAmount,
            srcSafetyDeposit: this.srcSafetyDeposit,
            timeLocks: this.timeLocks,
            deadline: this.deadline,
            srcAssetIsNative: this.srcAssetIsNative,
            takingAmount: this.takingAmount,
            salt: this.salt,
            multipleFillsAllowed: this.multipleFillsAllowed,
            partialFillsAllowed: this.partialFillAllowed,
            auction: this.auction
        })
    }

    static getOrderHashBuffer(params: OrderHashParams): Buffer {
        const auctionHash =
            'auction' in params
                ? params.auction.hashForTon()
                : params.auctionHash

        return bufferFromHex(
            keccak256(
                Buffer.concat([
                    params.hashLock.toBuffer(),
                    params.maker.toBuffer(),
                    params.makerAsset.toBuffer(),
                    Buffer.from(params.makingAmount.toString(16).padStart(16, '0'), 'hex'),
                    Buffer.from(params.srcSafetyDeposit.toString(16).padStart(16, '0'), 'hex'),
                    Buffer.from(params.timeLocks.build().toString(16).padStart(64, '0'), 'hex'),
                    Buffer.from(params.deadline.toString(16).padStart(16, '0'), 'hex'),
                    Buffer.from([Number(params.srcAssetIsNative)]),
                    Buffer.from(params.takingAmount.toString(16).padStart(64, '0'), 'hex'),
                    auctionHash,
                    Buffer.from([Number(params.multipleFillsAllowed)]),
                    Buffer.from([Number(params.partialFillsAllowed)]),
                    Buffer.from(params.salt.toString(16).padStart(16, '0'), 'hex')
                ])
            )
        )
    }

    public getCalculator(): AuctionCalculator {
        const details = this.details.auction

        return new AuctionCalculator(
            details.startTime,
            details.duration,
            details.initialRateBump,
            details.points,
            0n // no taker fee for TON
        )
    }

    /**
     * Calculate expiration delay from deadline and auction times
     */
    static calcExpirationDelay(
        deadline: bigint,
        startTime: bigint,
        duration: bigint
    ): bigint {
        return deadline - startTime - duration
    }
}