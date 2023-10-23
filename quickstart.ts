import axios from 'axios';
import { Interface, Wallet, parseUnits } from 'ethers';
import { getAddresses } from './utils/config';
import { getUserInputYN } from './utils/input';
import { config } from 'dotenv';
config();

// Get settings from environment variables (.env file)
const SRC_CHAIN_ID = Number(process.env.SRC_CHAIN_ID);
const DST_CHAIN_ID = Number(process.env.DST_CHAIN_ID);
const USDC_TO_WRAP = String(process.env.USDC_TO_WRAP);

// Get USDC and WUSDC addresses on the destination chain
const dstAddresses = getAddresses(DST_CHAIN_ID);

// Define some helper constants
const isSingleChain = SRC_CHAIN_ID === DST_CHAIN_ID;
const endpointPrefix = isSingleChain ? '/v1/single-chain' : '/v1/cross-chain';

// Initialize contract interfaces for USDC and WUSDC (to encode tx data)
const usdcTokenInterface = new Interface(['function approve(address,uint256)']);
const wUsdcTokenInterface = new Interface(['function mint(uint256)']);

// Initialize the wallet to sign and fund the tx with USDC
const wallet = new Wallet(process.env.WALLET_PRIVATE_KEY!); // set it in .env

// Initialize the axios client
const axiosClient = axios.create({
  baseURL: 'https://api.peaze.com/api',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.PEAZE_API_KEY,
  },
});

// Estimates the cost of the transaction by calling the /estimate endpoint
async function estimateTransaction() {
  // Convert the USDC amount to *destination* chain decimals (6 on supported chains)
  const tokenAmount = parseUnits(USDC_TO_WRAP, 6);

  // Encode a tx to approve the WUSDC contract to transfer USDC from the caller
  const approvalTx = {
    to: dstAddresses.USDC,
    data: usdcTokenInterface.encodeFunctionData('approve', [
      dstAddresses.WUSDC,
      tokenAmount,
    ]),
  };

  // Encode a tx to mint WUSDC tokens
  const mintTx = {
    to: dstAddresses.WUSDC,
    data: wUsdcTokenInterface.encodeFunctionData('mint', [tokenAmount]),
    value: 0n.toString(), // can be omitted here, since this transaction has value 0
  };

  // Specify that we expect to receive WUSDC tokens as a result of the tx
  const expectedERC20Tokens = [dstAddresses.WUSDC];

  // Send the request to the estimate endpoint
  const { data } = await axiosClient.post(`${endpointPrefix}/estimate`, {
    sourceChain: SRC_CHAIN_ID,
    destinationChain: DST_CHAIN_ID,
    userAddress: wallet.address, // address signing and funding the tx with USDC
    tokenAmount: tokenAmount.toString(), // USDC amount to fund the tx with (in dst decimals)
    transactions: [approvalTx, mintTx], // array of individual txs to execute in order
    expectedERC20Tokens, // array of ERC-20 tokens we expect to receive as a result of the tx
  });

  return data;
}

async function main() {
  console.log('-'.repeat(60));
  console.log(`Quickstart tx from chain ${SRC_CHAIN_ID} to ${DST_CHAIN_ID}`);
  console.log('-'.repeat(60) + '\n');

  console.log('Getting tx estimate...');

  // Get a quote for the transaction
  const { quote, costSummary } = await estimateTransaction();
  console.log(`Quote data:\n${JSON.stringify(quote, null, 2)}\n`);

  // Extract typed data to sign and generate signatures
  const { peazeTypedData, permitTypedData } = quote;

  const signatures = {
    peazeSignature: await wallet.signTypedData(
      peazeTypedData.domain,
      peazeTypedData.types,
      peazeTypedData.message,
    ),
    permitSignature: await wallet.signTypedData(
      permitTypedData.domain,
      permitTypedData.types,
      permitTypedData.message,
    ),
  };

  // Show total cost and check if we want to proceed
  const totalCost: number = costSummary.totalAmount;
  console.log(`Total cost (tx amount + gas + fees): ${totalCost} USDC\n`);

  const shouldExecute = await getUserInputYN(
    'Signatures generated. Would you like to execute the tx? (y/n) ',
  );
  if (!shouldExecute) return;

  // Send the request to the execute endpoint
  console.log('Executing transaction...');
  const { data } = await axiosClient.post(`${endpointPrefix}/execute`, {
    quote,
    signatures,
  });

  console.log(`Transaction submitted:\n${JSON.stringify(data, null, 2)}\n`);
  if (isSingleChain) return;
  console.log(
    'Monitor the cross-chain tx status on https://layerzeroscan.com.',
    'Simply search for the tx hash shown above.',
  );
}

main().catch(e => {
  const errorMsg = e.response?.data?.message ?? `${e}`;
  const errorDetails = JSON.stringify(e.response?.data?.data, null, 2);

  console.log('Oops... we got an error :(');
  console.log(errorMsg);
  if (errorDetails) console.log(`Error details:\n${errorDetails}`);
  process.exit(1);
});
