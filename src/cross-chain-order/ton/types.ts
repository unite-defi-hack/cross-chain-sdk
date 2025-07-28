import {AuctionDetails} from '../../domains/auction-details'
import {AddressLike, TonAddress} from '../../domains/addresses'
import {HashLock} from '../../domains/hash-lock'
import {TimeLocks} from '../../domains/time-locks'
import {TonChain, SupportedChain} from '../../chains'

export type TonCrossChainOrderInfo = {
    /**
     * Source chain asset (TON token address)
     */
    makerAsset: TonAddress
    /**
     * Destination chain asset
     */
    takerAsset: AddressLike
    /**
     * Source chain amount
     */
    makingAmount: bigint
    /**
     * Destination chain min amount
     */
    takingAmount: bigint
    maker: TonAddress
    salt?: bigint
    /**
     * Destination chain receiver address
     *
     * If not set, then `maker` used
     */
    receiver?: AddressLike
}

export type TonExtra = {
    /**
     * Order will expire in `orderExpirationDelay` after auction ends
     * Default 12s
     */
    orderExpirationDelay?: bigint
    /**
     * Can be omitted for salt > UINT_32_MAX
     */
    source?: string
    allowMultipleFills?: boolean
    allowPartialFills?: boolean
    // random value in interval [0, UINT_32_MAX]
    // If salt > UINT_32_MAX, then source won't be injected to it
    salt?: bigint
    /**
     * Whether the source asset is native TON
     */
    srcAssetIsNative?: boolean
}

export type TonDetails = {
    auction: AuctionDetails
    /**
     * Time from which order can be executed
     */
    resolvingStartTime?: bigint
}

export type TonEscrowParams = {
    hashLock: HashLock
    srcChainId: TonChain
    dstChainId: SupportedChain
    srcSafetyDeposit: bigint
    dstSafetyDeposit: bigint
    timeLocks: TimeLocks
}

export type OrderInfoData = {
    makerAsset: TonAddress
    takerAsset: AddressLike
    makingAmount: bigint
    takingAmount: bigint
    maker: TonAddress
    salt?: bigint
    receiver?: AddressLike
}

export type TonOrderJSON = {
    orderInfo: {
        srcToken: string // TON address (friendly format)
        dstToken: string // destination chain address
        maker: string // TON address (friendly format)
        srcAmount: string // bigint
        minDstAmount: string // bigint
        receiver: string // destination chain address
    }
    escrowParams: {
        hashLock: string // 32bytes hex
        srcChainId: TonChain
        dstChainId: SupportedChain
        srcSafetyDeposit: string // bigint
        dstSafetyDeposit: string // bigint
        timeLocks: string // u256 bigint
    }
    details: {
        auction: {
            startTime: string
            duration: string
            initialRateBump: number
            points: Array<{coefficient: number; delay: number}>
        }
        resolvingStartTime?: string
    }
    extra: {
        srcAssetIsNative: boolean
        orderExpirationDelay: string // bigint
        source?: string
        allowMultipleFills: boolean
        allowPartialFills: boolean
        salt: string // bigint
    }
}

export type OrderHashParams = {
    hashLock: HashLock
    maker: TonAddress
    makerAsset: TonAddress
    makingAmount: bigint
    srcSafetyDeposit: bigint
    timeLocks: TimeLocks
    deadline: bigint
    srcAssetIsNative: boolean
    takingAmount: bigint
    salt: bigint
    multipleFillsAllowed: boolean
    partialFillsAllowed: boolean
} & (
    | {
          auction: AuctionDetails
      }
    | {
          auctionHash: Buffer
      }
)
