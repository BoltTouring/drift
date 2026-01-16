/**
 * Zap Split Logic for Drift
 * 
 * Implements the zap splitting between curator, original author, and Drift platform.
 * 
 * Default split:
 * - 45% to curator
 * - 45% to original author  
 * - 10% to Drift platform wallet
 * 
 * If original author has no zap address, their 45% is split:
 * - 22.5% to curator
 * - 22.5% to Drift wallet
 * 
 * If curator has no zap address, similar redistribution applies.
 */

import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { Snippet } from '@/types/snippet';
import type { NostrMetadata, NostrEvent } from '@nostrify/nostrify';

/** Drift platform wallet lightning address */
export const DRIFT_PLATFORM_WALLET = 'drift@getalby.com'; // Placeholder

/** Zap recipient info */
export interface ZapRecipient {
  pubkey: string;
  lightningAddress?: string;
  lnurl?: string;
  name?: string;
  percentage: number;
  amount: number; // Calculated amount in sats
}

/** Zap split result */
export interface ZapSplit {
  recipients: ZapRecipient[];
  curatorHasWallet: boolean;
  originalAuthorHasWallet: boolean;
  totalAmount: number;
}

/**
 * Get lightning address from user metadata
 */
function getLightningAddress(metadata: NostrMetadata | undefined): string | undefined {
  if (!metadata) return undefined;
  return metadata.lud16 || metadata.lud06;
}

/**
 * Calculate zap split for a snippet
 */
export function calculateZapSplit(
  totalAmount: number,
  curatorPubkey: string | undefined,
  curatorLightningAddress: string | undefined,
  curatorName: string | undefined,
  originalAuthorPubkey: string | undefined,
  originalAuthorLightningAddress: string | undefined,
  originalAuthorName: string | undefined,
): ZapSplit {
  const recipients: ZapRecipient[] = [];
  
  const curatorHasWallet = !!curatorLightningAddress;
  const originalAuthorHasWallet = !!originalAuthorLightningAddress;
  
  // Both have wallets - standard split
  if (curatorHasWallet && originalAuthorHasWallet && curatorPubkey && originalAuthorPubkey) {
    recipients.push({
      pubkey: curatorPubkey,
      lightningAddress: curatorLightningAddress,
      name: curatorName,
      percentage: 45,
      amount: Math.floor(totalAmount * 0.45),
    });
    
    recipients.push({
      pubkey: originalAuthorPubkey,
      lightningAddress: originalAuthorLightningAddress,
      name: originalAuthorName,
      percentage: 45,
      amount: Math.floor(totalAmount * 0.45),
    });
    
    recipients.push({
      pubkey: 'drift-platform',
      lightningAddress: DRIFT_PLATFORM_WALLET,
      name: 'Drift',
      percentage: 10,
      amount: Math.floor(totalAmount * 0.10),
    });
  }
  // Only curator has wallet
  else if (curatorHasWallet && !originalAuthorHasWallet && curatorPubkey) {
    recipients.push({
      pubkey: curatorPubkey,
      lightningAddress: curatorLightningAddress,
      name: curatorName,
      percentage: 67.5, // 45% + 22.5%
      amount: Math.floor(totalAmount * 0.675),
    });
    
    recipients.push({
      pubkey: 'drift-platform',
      lightningAddress: DRIFT_PLATFORM_WALLET,
      name: 'Drift',
      percentage: 32.5, // 10% + 22.5%
      amount: Math.floor(totalAmount * 0.325),
    });
  }
  // Only original author has wallet
  else if (!curatorHasWallet && originalAuthorHasWallet && originalAuthorPubkey) {
    recipients.push({
      pubkey: originalAuthorPubkey,
      lightningAddress: originalAuthorLightningAddress,
      name: originalAuthorName,
      percentage: 67.5, // 45% + 22.5%
      amount: Math.floor(totalAmount * 0.675),
    });
    
    recipients.push({
      pubkey: 'drift-platform',
      lightningAddress: DRIFT_PLATFORM_WALLET,
      name: 'Drift',
      percentage: 32.5, // 10% + 22.5%
      amount: Math.floor(totalAmount * 0.325),
    });
  }
  // Neither has wallet - all to Drift
  else {
    recipients.push({
      pubkey: 'drift-platform',
      lightningAddress: DRIFT_PLATFORM_WALLET,
      name: 'Drift',
      percentage: 100,
      amount: totalAmount,
    });
  }
  
  return {
    recipients,
    curatorHasWallet,
    originalAuthorHasWallet,
    totalAmount,
  };
}

/**
 * Hook to calculate zap split for a snippet
 */
export function useZapSplit(snippet: Snippet | undefined, amount: number) {
  const { nostr } = useNostr();
  
  return useQuery({
    queryKey: ['zap-split', snippet?.id, amount],
    queryFn: async ({ signal }) => {
      if (!snippet) {
        return calculateZapSplit(amount, undefined, undefined, undefined, undefined, undefined, undefined);
      }
      
      const timeout = AbortSignal.timeout(3000);
      const combinedSignal = AbortSignal.any([signal, timeout]);
      
      // Fetch metadata for curator and original author
      const pubkeysToFetch: string[] = [];
      if (snippet.source.curatorPubkey) {
        pubkeysToFetch.push(snippet.source.curatorPubkey);
      }
      if (snippet.source.originalAuthorPubkey) {
        pubkeysToFetch.push(snippet.source.originalAuthorPubkey);
      }
      
      if (pubkeysToFetch.length === 0) {
        return calculateZapSplit(amount, undefined, undefined, undefined, undefined, undefined, undefined);
      }
      
      try {
        const metadataEvents = await nostr.query([
          {
            kinds: [0],
            authors: pubkeysToFetch,
          },
        ], { signal: combinedSignal });
        
        // Parse metadata
        const metadataMap = new Map<string, NostrMetadata>();
        for (const event of metadataEvents) {
          try {
            const metadata = JSON.parse(event.content) as NostrMetadata;
            metadataMap.set(event.pubkey, metadata);
          } catch {
            // Skip invalid metadata
          }
        }
        
        const curatorMetadata = snippet.source.curatorPubkey 
          ? metadataMap.get(snippet.source.curatorPubkey) 
          : undefined;
        const originalAuthorMetadata = snippet.source.originalAuthorPubkey 
          ? metadataMap.get(snippet.source.originalAuthorPubkey) 
          : undefined;
        
        return calculateZapSplit(
          amount,
          snippet.source.curatorPubkey,
          getLightningAddress(curatorMetadata),
          curatorMetadata?.name || curatorMetadata?.display_name,
          snippet.source.originalAuthorPubkey,
          getLightningAddress(originalAuthorMetadata),
          originalAuthorMetadata?.name || originalAuthorMetadata?.display_name,
        );
      } catch (error) {
        console.warn('Failed to fetch metadata for zap split:', error);
        return calculateZapSplit(amount, undefined, undefined, undefined, undefined, undefined, undefined);
      }
    },
    enabled: !!snippet && amount > 0,
    staleTime: 60000,
  });
}

/**
 * Format zap split for display
 */
export function formatZapSplit(split: ZapSplit): string {
  if (split.recipients.length === 0) {
    return 'No recipients';
  }
  
  return split.recipients
    .map(r => `${r.name || 'Unknown'}: ${r.percentage}% (${r.amount} sats)`)
    .join('\n');
}
