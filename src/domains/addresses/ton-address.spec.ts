import {TonAddress} from './ton-address'
import {EvmAddress} from './evm-address'
import {AddressComplement} from './address-complement'
import {NetworkEnum} from '../../chains'
import {createAddress} from './address.factory'

describe('TonAddress', () => {
    const TEST_ADDRESSES = {
        MAINNET: {
            // Valid TON address generated using @ton/core
            FRIENDLY_BOUNCEABLE: 'EQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0WwgpgOJ',
            FRIENDLY_NON_BOUNCEABLE: 'UQD4FPq-PRDieyQKkizFTRK2YGABRYUlGGYo1FyZ0Wwgpl5M',
            RAW: '0:f814fabe3d10e27b240a922cc54d12b6606001458525186628d45c99d16c20a6'
        },
        INVALID: {
            MASTERCHAIN: '-1:0000000000000000000000000000000000000000000000000000000000000000',
            MALFORMED: 'invalid-address',
            WRONG_WORKCHAIN: '1:f814fabe3d10e27b240a922cc54d12b6606001458525186628d45c99d16c20a6'
        }
    }

    describe('Address Creation', () => {
        it('should create address from friendly format', () => {
            const address = TonAddress.fromString(TEST_ADDRESSES.MAINNET.FRIENDLY_BOUNCEABLE)
            expect(address).toBeInstanceOf(TonAddress)
            expect(address.getWorkchain()).toBe(0)
        })

        it('should create address from raw format', () => {
            const hash = Buffer.from('f814fabe3d10e27b240a922cc54d12b6606001458525186628d45c99d16c20a6', 'hex')
            const address = TonAddress.fromRaw(0, hash)
            expect(address).toBeInstanceOf(TonAddress)
            expect(address.getWorkchain()).toBe(0)
        })

        it('should reject non-workchain-0 addresses', () => {
            expect(() => {
                TonAddress.fromString(TEST_ADDRESSES.INVALID.MASTERCHAIN)
            }).toThrow('Only workchain 0 addresses are supported for swaps')
        })

        it('should reject malformed addresses', () => {
            expect(() => {
                TonAddress.fromString(TEST_ADDRESSES.INVALID.MALFORMED)
            }).toThrow()
        })
    })

    describe('AddressLike Interface', () => {
        let address: TonAddress

        beforeEach(() => {
            address = TonAddress.fromString(TEST_ADDRESSES.MAINNET.FRIENDLY_BOUNCEABLE)
        })

        it('should implement toString()', () => {
            const str = address.toString()
            expect(typeof str).toBe('string')
            expect(str.length).toBeGreaterThan(0)
        })

        it('should implement toBuffer()', () => {
            const buffer = address.toBuffer()
            expect(buffer).toBeInstanceOf(Buffer)
            expect(buffer.length).toBe(36) // 4 bytes workchain + 32 bytes hash
        })

        it('should implement toHex()', () => {
            const hex = address.toHex()
            expect(hex).toMatch(/^0x[0-9a-f]+$/i)
        })

        it('should implement toBigint()', () => {
            const bigint = address.toBigint()
            expect(typeof bigint).toBe('bigint')
            expect(bigint).toBeGreaterThan(0n)
        })

        it('should implement equal()', () => {
            const same = TonAddress.fromString(TEST_ADDRESSES.MAINNET.FRIENDLY_BOUNCEABLE)
            expect(address.equal(same)).toBe(true)
        })

        it('should implement isZero() and isNative()', () => {
            expect(address.isZero()).toBe(false)
            expect(address.isNative()).toBe(false)
            
            expect(TonAddress.ZERO.isZero()).toBe(true)
            expect(TonAddress.NATIVE.isNative()).toBe(true)
        })
    })

    describe('Complement System', () => {
        let address: TonAddress

        beforeEach(() => {
            address = TonAddress.fromString(TEST_ADDRESSES.MAINNET.FRIENDLY_BOUNCEABLE)
        })

        it('should split address into complement and EVM parts', () => {
            const [complement, evmPart] = address.splitToParts()
            
            expect(complement).toBeInstanceOf(AddressComplement)
            expect(evmPart).toBeInstanceOf(EvmAddress)
        })

        it('should reconstruct address from complement and EVM parts', () => {
            const [complement, evmPart] = address.splitToParts()
            const reconstructed = TonAddress.fromParts([complement, evmPart])
            
            expect(address.equal(reconstructed)).toBe(true)
        })

        it('should round-trip through complement system', () => {
            // Split into parts
            const [complement, evmPart] = address.splitToParts()
            
            // Reconstruct
            const reconstructed = TonAddress.fromParts([complement, evmPart])
            
            // Should be equal
            expect(address.equal(reconstructed)).toBe(true)
            expect(address.toBigint()).toBe(reconstructed.toBigint())
        })
    })

    describe('TON-Specific Methods', () => {
        let address: TonAddress

        beforeEach(() => {
            address = TonAddress.fromString(TEST_ADDRESSES.MAINNET.FRIENDLY_BOUNCEABLE)
        })

        it('should return workchain', () => {
            expect(address.getWorkchain()).toBe(0)
        })

        it('should convert to raw string', () => {
            const raw = address.toRawString()
            expect(raw).toMatch(/^0:[0-9a-f]{64}$/i)
        })

        it('should convert to friendly string with options', () => {
            const friendly = address.toFriendlyString(true, true, false)
            expect(typeof friendly).toBe('string')
            expect(friendly.length).toBeGreaterThan(0)
        })
    })

    describe('Address Factory Integration', () => {
        it('should create TON address via factory for mainnet', () => {
            const address = createAddress(
                TEST_ADDRESSES.MAINNET.FRIENDLY_BOUNCEABLE,
                NetworkEnum.TON_MAINNET
            )
            
            expect(address).toBeInstanceOf(TonAddress)
        })

        it('should create TON address via factory for testnet', () => {
            const address = createAddress(
                TEST_ADDRESSES.MAINNET.FRIENDLY_BOUNCEABLE,
                NetworkEnum.TON_TESTNET
            )
            
            expect(address).toBeInstanceOf(TonAddress)
        })

        it('should create TON address from complement via factory', () => {
            // First create a regular address and split it
            const originalAddress = TonAddress.fromString(TEST_ADDRESSES.MAINNET.FRIENDLY_BOUNCEABLE)
            const [complement, evmPart] = originalAddress.splitToParts()
            
            // Then recreate using factory with complement
            const recreatedAddress = createAddress(
                evmPart.toString(),
                NetworkEnum.TON_MAINNET,
                complement
            )
            
            expect(recreatedAddress).toBeInstanceOf(TonAddress)
            expect(originalAddress.equal(recreatedAddress)).toBe(true)
        })
    })
})
