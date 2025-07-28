import {Address} from '@ton/core'
import {hexToUint8Array, uint8ArrayToHex} from '@1inch/byte-utils'
import {hexlify} from 'ethers'
import {UINT_160_MAX} from '@1inch/fusion-sdk'
import {AddressLike, HexString} from './types'
import {AddressComplement} from './address-complement'
import {EvmAddress} from './evm-address'
import {isBigintString} from '../../utils/numbers/is-bigint-string'

/**
 * Address representation for TON blockchain.
 * Supports both user-friendly and raw address formats.
 * Only workchain 0 addresses are supported for cross-chain swaps.
 */
export class TonAddress implements AddressLike {
    public static readonly ZERO = TonAddress.fromRaw(0, Buffer.alloc(32))

    public static readonly NATIVE = TonAddress.fromRaw(0, Buffer.alloc(32, 1))

    // For cross-chain compatibility, use the same address as NATIVE for TON
    public static readonly WRAPPED_NATIVE = TonAddress.fromRaw(
        0,
        Buffer.alloc(32, 1)
    )

    private readonly address: Address

    constructor(address: string | Address) {
        if (typeof address === 'string') {
            this.address = Address.parse(address)
        } else {
            this.address = address
        }

        this.validateWorkchain()
    }

    // ---------- static constructors ----------
    static fromString(str: string): TonAddress {
        return new TonAddress(str)
    }

    static fromRaw(workchain: number, hash: Buffer): TonAddress {
        TonAddress.validateWorkchainStatic(workchain)

        return new TonAddress(
            Address.parseRaw(`${workchain}:${hash.toString('hex')}`)
        )
    }

    static fromFriendly(address: string): TonAddress {
        return new TonAddress(Address.parseFriendly(address).address)
    }

    /**
     * Reconstruct TON address from complement and EVM part (similar to Solana)
     * @see splitToParts
     */
    static fromParts(parts: [AddressComplement, EvmAddress]): TonAddress {
        const highBits = parts[0].inner
        const lowBits = parts[1].toBigint()
        const address = (highBits << 160n) | lowBits

        return TonAddress.fromBigInt(address)
    }

    static fromBigInt(val: bigint): TonAddress {
        // Convert bigint to 36-byte buffer (4 bytes workchain + 32 bytes hash)
        const buffer = hexToUint8Array(
            '0x' + val.toString(16).padStart(72, '0') // 72 hex chars = 36 bytes
        )

        return TonAddress.fromBuffer(buffer)
    }

    static fromBuffer(buf: Buffer | Uint8Array): TonAddress {
        if (buf.length !== 36) {
            throw new Error(
                'TON address buffer must be 36 bytes (4 bytes workchain + 32 bytes hash)'
            )
        }

        const buffer = Buffer.from(buf)
        const workchain = buffer.readInt32BE(0)
        const hash = buffer.subarray(4, 36)

        return TonAddress.fromRaw(workchain, hash)
    }

    static fromUnknown(val: unknown): TonAddress {
        if (!val) {
            throw new Error('invalid TON address')
        }

        if (typeof val === 'string') {
            if (isBigintString(val)) {
                return TonAddress.fromBigInt(BigInt(val))
            }

            return new TonAddress(val)
        }

        if (typeof val === 'bigint') {
            return TonAddress.fromBigInt(val)
        }

        if (
            typeof val === 'object' &&
            'toBuffer' in val &&
            typeof val.toBuffer === 'function'
        ) {
            const buffer = val.toBuffer()

            if (buffer instanceof Buffer || buffer instanceof Uint8Array) {
                return TonAddress.fromBuffer(buffer)
            }
        }

        throw new Error('invalid TON address')
    }

    private static validateWorkchainStatic(workchain: number): void {
        if (workchain !== 0) {
            throw new Error(
                'Only workchain 0 addresses are supported for swaps'
            )
        }
    }

    private validateWorkchain(): void {
        if (this.address.workChain !== 0) {
            throw new Error(
                'Only workchain 0 addresses are supported for swaps'
            )
        }
    }

    // ---------- AddressLike interface ----------
    public nativeAsZero(): this {
        return this
    }

    public zeroAsNative(): this {
        return this
    }

    toString(): string {
        return this.address.toString({
            urlSafe: true,
            bounceable: true,
            testOnly: false
        })
    }

    toJSON(): string {
        return this.toString()
    }

    public toBuffer(): Buffer {
        // Create 36-byte buffer: 4 bytes workchain + 32 bytes hash
        const buffer = Buffer.alloc(36)
        buffer.writeInt32BE(this.address.workChain, 0)
        buffer.set(this.address.hash, 4)

        return buffer
    }

    public equal(other: AddressLike): boolean {
        if (other instanceof TonAddress) {
            return this.address.equals(other.address)
        }

        return this.toBuffer().equals(other.toBuffer())
    }

    public isNative(): boolean {
        return this.equal(TonAddress.NATIVE)
    }

    public isZero(): boolean {
        return this.equal(TonAddress.ZERO)
    }

    public toHex(): HexString {
        return hexlify(this.toBuffer()) as HexString
    }

    public toBigint(): bigint {
        return BigInt(uint8ArrayToHex(this.toBuffer()))
    }

    public splitToParts(): [AddressComplement, EvmAddress] {
        const bn = this.toBigint()

        return [
            new AddressComplement(bn >> 160n),
            EvmAddress.fromBigInt(bn & UINT_160_MAX)
        ]
    }

    // ---------- TON-specific methods ----------
    public toRawString(): string {
        return `${this.address.workChain}:${this.address.hash.toString('hex')}`
    }

    public toFriendlyString(
        urlSafe: boolean = true,
        bounceable: boolean = true,
        testOnly: boolean = false
    ): string {
        return this.address.toString({
            urlSafe,
            bounceable,
            testOnly
        })
    }

    public getWorkchain(): number {
        return this.address.workChain
    }
}
