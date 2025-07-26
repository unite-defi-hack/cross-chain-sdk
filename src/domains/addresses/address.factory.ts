import {EvmAddress} from './evm-address'
import {SolanaAddress} from './solana-address'
import {TonAddress} from './ton-address'
import {AddressComplement} from './address-complement'
import {isEvm, isTon, isSolana, SupportedChain} from '../../chains'
import {AddressForChain} from '../../type-utils'

export function createAddress<Chain extends SupportedChain>(
    // hex/base58/bigint/ton-friendly
    address: string | bigint,
    chainId: Chain,
    complement?: AddressComplement
): AddressForChain<Chain> {
    if (isEvm(chainId)) {
        return EvmAddress.fromUnknown(address) as AddressForChain<Chain>
    }

    if (isTon(chainId)) {
        if (complement) {
            const evm = EvmAddress.fromUnknown(address)
            return TonAddress.fromParts([complement, evm]) as AddressForChain<Chain>
        }
        return TonAddress.fromUnknown(address) as AddressForChain<Chain>
    }

    if (isSolana(chainId)) {
        if (complement) {
            const evm = EvmAddress.fromUnknown(address)
            return SolanaAddress.fromParts([complement, evm]) as AddressForChain<Chain>
        }
        return SolanaAddress.fromUnknown(address) as AddressForChain<Chain>
    }

    throw new Error(`Unsupported chain: ${chainId}`)
}
