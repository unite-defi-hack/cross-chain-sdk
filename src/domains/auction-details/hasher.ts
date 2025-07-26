import {BorshCoder} from '@coral-xyz/anchor'
import {keccak256} from 'ethers'
import {AuctionDetails} from './auction-details'
import {uintAsBeBytes} from '../../utils/numbers/uint-as-be-bytes'
import {bufferFromHex} from '../../utils/bytes'
import {IDL} from '../../idl/cross-chain-escrow-src'

export function hashForSolana(details: AuctionDetails): Buffer {
    const bytes = new BorshCoder(IDL).types.encode('auctionData', {
        startTime: Number(details.startTime),
        duration: Number(details.duration),
        initialRateBump: [uintAsBeBytes(details.initialRateBump, 24)],
        pointsAndTimeDeltas: details.points.map((p) => ({
            rateBump: [uintAsBeBytes(BigInt(p.coefficient), 24)],
            timeDelta: p.delay
        }))
    })

    return bufferFromHex(keccak256(bytes))
}

/**
 * TON auction data hash function
 * 
 * Based on analysis of TON contracts, this follows the same pattern as Solana
 * but uses TON's Cell-based serialization approach with Keccak256 hashing.
 * 
 * The TON contracts use `hash_keccak256()` which is Keccak256, not SHA256,
 * maintaining cross-chain hash compatibility.
 */
export function hashForTon(details: AuctionDetails): Buffer {
    // TON Cell-like serialization approach
    // This mimics how TON would serialize auction data in a Cell structure
    
    // Serialize auction data following TON patterns:
    // - 32-bit fields for times and durations
    // - 16-bit for rate bumps  
    // - Variable length array for points
    const startTimeBytes = Buffer.alloc(4)
    startTimeBytes.writeUInt32BE(Number(details.startTime), 0)
    
    const durationBytes = Buffer.alloc(4)
    durationBytes.writeUInt32BE(Number(details.duration), 0)
    
    const initialRateBumpBytes = Buffer.alloc(2)
    initialRateBumpBytes.writeUInt16BE(Number(details.initialRateBump), 0)
    
    // Points count (32-bit)
    const pointsCountBytes = Buffer.alloc(4)
    pointsCountBytes.writeUInt32BE(details.points.length, 0)
    
    // Serialize each point
    const pointsBytes = details.points.map((p) => {
        const rateBumpBytes = Buffer.alloc(2)
        rateBumpBytes.writeUInt16BE(Number(p.coefficient), 0)
        
        const timeDeltaBytes = Buffer.alloc(2)
        timeDeltaBytes.writeUInt16BE(p.delay, 0)
        
        return Buffer.concat([rateBumpBytes, timeDeltaBytes])
    })
    
    // Concatenate all data (following TON Cell serialization order)
    const data = Buffer.concat([
        startTimeBytes,
        durationBytes,
        initialRateBumpBytes,
        pointsCountBytes,
        ...pointsBytes
    ])

    // Use Keccak256 (same as TON's hash_keccak256())
    return bufferFromHex(keccak256(data))
}
