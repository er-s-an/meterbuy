import "server-only";

import { createPublicClient, formatEther, formatUnits, http } from "viem";
import { sepolia } from "viem/chains";
import type { WalletView } from "@/lib/types";
import { burnerAccount, QUOTE_USD, rpcUrl, usdcAddress } from "@/lib/telegraph/config";

const balanceAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

export async function readWallet(): Promise<WalletView> {
  const account = burnerAccount();
  if (!account) {
    return {
      address: null,
      eth: "0",
      usdc: "0",
      canPay: false,
      note: "No burner key is loaded on the server. Live settlement is off. Mock will not invent a receipt.",
    };
  }

  try {
    const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl()) });
    const [wei, atomic] = await Promise.all([
      client.getBalance({ address: account.address }),
      client.readContract({
        address: usdcAddress(),
        abi: balanceAbi,
        functionName: "balanceOf",
        args: [account.address],
      }),
    ]);
    const usdc = Number(formatUnits(atomic, 6));
    const eth = formatEther(wei);
    const canPay = usdc + 1e-12 >= QUOTE_USD;
    const note = canPay
      ? "The burner holds test USDC. A Live run can settle an exact payment on Sepolia."
      : "The burner holds no spendable test USDC. A Live run falls back to Mock and does not print a receipt. Sepolia ETH is only needed to mint more test USDC.";
    return {
      address: account.address,
      eth,
      usdc: usdc.toFixed(6),
      canPay,
      note,
    };
  } catch {
    return {
      address: account.address,
      eth: "0",
      usdc: "0",
      canPay: false,
      note: "The balance check did not answer. Live settlement stays off until the desk can read the burner.",
    };
  }
}
