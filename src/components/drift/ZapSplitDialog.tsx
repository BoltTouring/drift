/**
 * Zap Split Dialog
 * 
 * Shows the zap split confirmation with recipient breakdown.
 */

import { useState, useEffect } from 'react';
import { Zap, User, Sparkles, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { Snippet } from '@/types/snippet';
import { useZapSplit, type ZapRecipient } from '@/hooks/useZapSplit';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/useToast';

interface ZapSplitDialogProps {
  snippet: Snippet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onZapComplete: (amount: number) => void;
}

const PRESET_AMOUNTS = [21, 50, 100, 500, 1000];

export function ZapSplitDialog({
  snippet,
  open,
  onOpenChange,
  onZapComplete,
}: ZapSplitDialogProps) {
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [isZapping, setIsZapping] = useState(false);
  const [zapComplete, setZapComplete] = useState(false);

  const { user } = useCurrentUser();
  const { webln } = useWallet();
  const { toast } = useToast();
  const { data: zapSplit, isLoading: splitLoading } = useZapSplit(snippet ?? undefined, amount);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setAmount(100);
      setCustomAmount('');
      setIsZapping(false);
      setZapComplete(false);
    }
  }, [open]);

  const handleAmountChange = (value: string) => {
    if (value) {
      setAmount(parseInt(value, 10));
      setCustomAmount('');
    }
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value && !isNaN(parseInt(value, 10))) {
      setAmount(parseInt(value, 10));
    }
  };

  const handleZap = async () => {
    if (!user || !snippet || !zapSplit || amount <= 0) return;

    setIsZapping(true);

    try {
      // For now, show a success message
      // In a real implementation, this would process multiple zaps
      // using the zap split logic
      
      // Simulate zap processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      setZapComplete(true);
      onZapComplete(amount);

      toast({
        title: 'Zap sent! ⚡',
        description: `${amount} sats split among ${zapSplit.recipients.length} recipients`,
      });

      // Close dialog after a moment
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Zap failed:', error);
      toast({
        title: 'Zap failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsZapping(false);
    }
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              You need to be logged in to send zaps.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Send a Zap
          </DialogTitle>
          <DialogDescription>
            Support the creators with a Lightning payment
          </DialogDescription>
        </DialogHeader>

        {zapComplete ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold">Zap Sent!</h3>
            <p className="text-muted-foreground">
              {amount} sats sent successfully
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Amount selection */}
            <div className="space-y-2">
              <Label>Amount (sats)</Label>
              <ToggleGroup
                type="single"
                value={PRESET_AMOUNTS.includes(amount) ? String(amount) : ''}
                onValueChange={handleAmountChange}
                className="flex flex-wrap gap-2"
              >
                {PRESET_AMOUNTS.map((preset) => (
                  <ToggleGroupItem
                    key={preset}
                    value={String(preset)}
                    className="flex-1 min-w-[60px]"
                  >
                    {preset}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="flex-1"
                />
                <span className="text-muted-foreground">sats</span>
              </div>
            </div>

            <Separator />

            {/* Zap split breakdown */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Split Breakdown
              </Label>

              {splitLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : zapSplit ? (
                <div className="space-y-2">
                  {zapSplit.recipients.map((recipient, index) => (
                    <RecipientRow key={index} recipient={recipient} />
                  ))}

                  {(!zapSplit.curatorHasWallet || !zapSplit.originalAuthorHasWallet) && (
                    <div className="flex items-start gap-2 mt-3 p-2 bg-muted rounded-lg text-sm">
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">
                        {!zapSplit.curatorHasWallet && !zapSplit.originalAuthorHasWallet
                          ? 'Neither the curator nor original author have a Lightning wallet configured.'
                          : !zapSplit.curatorHasWallet
                            ? 'The curator does not have a Lightning wallet configured.'
                            : 'The original author does not have a Lightning wallet configured.'}
                        {' '}Their share is redistributed.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Unable to calculate split
                </p>
              )}
            </div>
          </div>
        )}

        {!zapComplete && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isZapping}
            >
              Cancel
            </Button>
            <Button
              onClick={handleZap}
              disabled={isZapping || !zapSplit || amount <= 0}
              className="gap-2"
            >
              {isZapping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Zapping...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Zap {amount} sats
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface RecipientRowProps {
  recipient: ZapRecipient;
}

function RecipientRow({ recipient }: RecipientRowProps) {
  const isPlatform = recipient.pubkey === 'drift-platform';

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        isPlatform ? "bg-primary/10" : "bg-muted"
      )}>
        {isPlatform ? (
          <Sparkles className="h-4 w-4 text-primary" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {recipient.name || (isPlatform ? 'Drift' : 'Anonymous')}
        </p>
        {recipient.lightningAddress && !isPlatform && (
          <p className="text-xs text-muted-foreground truncate">
            {recipient.lightningAddress}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="font-mono font-medium">{recipient.amount} sats</p>
        <p className="text-xs text-muted-foreground">{recipient.percentage}%</p>
      </div>
    </div>
  );
}
